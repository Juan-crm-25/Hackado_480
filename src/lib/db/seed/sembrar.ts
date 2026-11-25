/**
 * Seed mínimo e idempotente: inserta o actualiza por clave natural, así que ejecutarlo dos veces deja los mismos datos.
 * Lo usa scripts/seed.ts (npm run db:seed) y los tests de integración.
 * Cada usuario tiene una cuenta de email y contraseña (CONTRASENA_DEMO) para el login simulado; no crea sesiones.
 */
import { count, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import catalogoJson from "../../../../data/catalog.json";
import { alumnosDemo } from "../../datos-prueba";
import { cifrarContrasena } from "../../contrasena";
import type { Catalogo } from "../../types";
import type { Db } from "../client";
import { categoria, clase, concepto, cuenta, curso, matricula, modulo, usuario } from "../schema";
import { CONTRASENA_DEMO, construirCatalogos, construirMatriculas, construirUsuarios } from "./datos";

/** En ON CONFLICT DO UPDATE: el valor que se intentaba insertar. */
const nuevo = (columna: string) => sql.raw(`excluded.${columna}`);

export type RecuentoSeed = Record<
  "categoria" | "curso" | "modulo" | "concepto" | "clase" | "usuario" | "cuenta" | "matricula",
  number
>;

export async function sembrar(db: Db): Promise<RecuentoSeed> {
  const catalogos = construirCatalogos(catalogoJson as Catalogo);
  const usuarios = construirUsuarios(alumnosDemo);
  // Se cifra una vez (fuera de la transacción): todas las cuentas del seed comparten contraseña.
  const passwordHash = await cifrarContrasena(CONTRASENA_DEMO);

  await db.transaction(async (tx) => {
    const cursoIds = new Map<string, string>();

    for (const catalogo of catalogos) {
      const [cat] = await tx
        .insert(categoria)
        .values(catalogo.categoria)
        .onConflictDoUpdate({ target: categoria.slug, set: { nombre: nuevo("nombre") } })
        .returning({ id: categoria.id });

      const [cur] = await tx
        .insert(curso)
        .values({ ...catalogo.curso, categoriaId: cat.id })
        .onConflictDoUpdate({
          target: curso.slug,
          set: {
            categoriaId: nuevo("categoria_id"),
            titulo: nuevo("titulo"),
            descripcion: nuevo("descripcion"),
            precioCentimos: nuevo("precio_centimos"),
            publicado: nuevo("publicado"),
          },
        })
        .returning({ id: curso.id });
      cursoIds.set(catalogo.curso.slug, cur.id);

      for (const m of catalogo.modulos) {
        const [mod] = await tx
          .insert(modulo)
          .values({ cursoId: cur.id, slug: m.slug, titulo: m.titulo, descripcion: m.descripcion, ordenSugerido: m.ordenSugerido })
          .onConflictDoUpdate({
            target: [modulo.cursoId, modulo.slug],
            set: { titulo: nuevo("titulo"), descripcion: nuevo("descripcion"), ordenSugerido: nuevo("orden_sugerido") },
          })
          .returning({ id: modulo.id });

        // Los cursos extra no tienen conceptos ni clases: un INSERT sin filas no es válido.
        if (m.conceptos.length > 0) {
          await tx
            .insert(concepto)
            .values(m.conceptos.map((c) => ({ ...c, moduloId: mod.id })))
            .onConflictDoUpdate({ target: [concepto.moduloId, concepto.slug], set: { nombre: nuevo("nombre") } });
        }

        if (m.clases.length > 0) {
          await tx
            .insert(clase)
            .values(m.clases.map((c) => ({ ...c, moduloId: mod.id })))
            .onConflictDoUpdate({
              target: [clase.moduloId, clase.slug],
              set: {
                titulo: nuevo("titulo"),
                videoUrl: nuevo("video_url"),
                duracionSegundos: nuevo("duracion_segundos"),
                orden: nuevo("orden"),
              },
            });
        }
      }
    }

    const filas = await tx
      .insert(usuario)
      .values(usuarios)
      .onConflictDoUpdate({
        target: usuario.email,
        set: {
          nombre: nuevo("nombre"),
          rol: nuevo("rol"),
          emailVerificado: nuevo("email_verificado"),
          esMenor: nuevo("es_menor"),
          consentimientoTutorLegal: nuevo("consentimiento_tutor_legal"),
          seudonimo: nuevo("seudonimo"),
        },
      })
      .returning({ id: usuario.id, email: usuario.email });
    const usuarioIds = new Map(filas.map((u) => [u.email, u.id]));

    // Cuenta de email y contraseña para el login simulado. Si ya existe no se toca (no se pisa la contraseña).
    await tx
      .insert(cuenta)
      .values(filas.map((u) => ({ usuarioId: u.id, proveedor: "credential", idCuentaProveedor: u.id, passwordHash })))
      .onConflictDoNothing({ target: [cuenta.proveedor, cuenta.idCuentaProveedor] });

    // Por invitación y ya enlazadas (los emails están verificados). Ver construirMatriculas().
    const matriculas = construirMatriculas(catalogos, usuarios).map((m) => ({
      cursoId: cursoIds.get(m.cursoSlug)!,
      email: m.email,
      usuarioId: usuarioIds.get(m.email)!,
      rolEnCurso: m.rolEnCurso,
      origen: "invitacion" as const,
    }));
    // Si ya existía (p. ej., de una compra), solo se enlaza y se fija el rol: el origen y el pedido no se tocan.
    await tx
      .insert(matricula)
      .values(matriculas)
      .onConflictDoUpdate({
        target: [matricula.cursoId, matricula.email],
        set: { usuarioId: nuevo("usuario_id"), rolEnCurso: nuevo("rol_en_curso") },
      });
  });

  const contar = async (tabla: PgTable) => {
    const [{ total }] = await db.select({ total: count() }).from(tabla);
    return total;
  };
  return {
    categoria: await contar(categoria),
    curso: await contar(curso),
    modulo: await contar(modulo),
    concepto: await contar(concepto),
    clase: await contar(clase),
    usuario: await contar(usuario),
    cuenta: await contar(cuenta),
    matricula: await contar(matricula),
  };
}
