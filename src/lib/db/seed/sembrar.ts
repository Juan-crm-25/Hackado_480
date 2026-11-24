/**
 * Seed mínimo e idempotente: inserta o actualiza por clave natural, así que ejecutarlo dos veces deja los mismos datos.
 * Lo usa scripts/seed.ts (npm run db:seed) y los tests de integración. No crea cuentas ni sesiones (eso, con el login).
 */
import { count, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import catalogoJson from "../../../../data/catalog.json";
import { alumnosDemo } from "../../datos-prueba";
import type { Catalogo } from "../../types";
import type { Db } from "../client";
import { categoria, clase, concepto, curso, matricula, modulo, usuario } from "../schema";
import { construirCatalogo, construirUsuarios } from "./datos";

/** En ON CONFLICT DO UPDATE: el valor que se intentaba insertar. */
const nuevo = (columna: string) => sql.raw(`excluded.${columna}`);

export type RecuentoSeed = Record<"categoria" | "curso" | "modulo" | "concepto" | "clase" | "usuario" | "matricula", number>;

export async function sembrar(db: Db): Promise<RecuentoSeed> {
  const catalogo = construirCatalogo(catalogoJson as Catalogo);
  const usuarios = construirUsuarios(alumnosDemo);

  await db.transaction(async (tx) => {
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

    for (const m of catalogo.modulos) {
      const [mod] = await tx
        .insert(modulo)
        .values({ cursoId: cur.id, slug: m.slug, titulo: m.titulo, descripcion: m.descripcion, ordenSugerido: m.ordenSugerido })
        .onConflictDoUpdate({
          target: [modulo.cursoId, modulo.slug],
          set: { titulo: nuevo("titulo"), descripcion: nuevo("descripcion"), ordenSugerido: nuevo("orden_sugerido") },
        })
        .returning({ id: modulo.id });

      await tx
        .insert(concepto)
        .values(m.conceptos.map((c) => ({ ...c, moduloId: mod.id })))
        .onConflictDoUpdate({ target: [concepto.moduloId, concepto.slug], set: { nombre: nuevo("nombre") } });

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
      .returning({ id: usuario.id, email: usuario.email, rol: usuario.rol });

    // Alumnos y profesor, por invitación y ya enlazados (sus emails están verificados).
    // El admin no necesita matrícula: pasa las comprobaciones de acceso en todos los cursos.
    const matriculas = filas
      .filter((u) => u.rol !== "admin")
      .map((u) => ({
        cursoId: cur.id,
        email: u.email,
        usuarioId: u.id,
        rolEnCurso: u.rol === "profesor" ? ("profesor" as const) : ("alumno" as const),
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
    matricula: await contar(matricula),
  };
}
