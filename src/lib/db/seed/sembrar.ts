/**
 * Seed mínimo e idempotente: inserta o actualiza por clave natural, así que ejecutarlo dos veces deja los mismos datos.
 * Lo usa scripts/seed.ts (npm run db:seed) y los tests de integración.
 * Cada usuario tiene una cuenta de email y contraseña (CONTRASENA_DEMO) para el login simulado; no crea sesiones.
 */
import { and, count, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import catalogoJson from "../../../../data/catalog.json";
import m1Html from "../../../../data/ejemplos-profesor/m1-html.json";
import m2Css from "../../../../data/ejemplos-profesor/m2-css.json";
import m3Responsive from "../../../../data/ejemplos-profesor/m3-responsive.json";
import m4Javascript from "../../../../data/ejemplos-profesor/m4-javascript.json";
import { alumnosDemo, progresoDemo } from "../../datos-prueba";
import { cifrarContrasena } from "../../contrasena";
import type { Catalogo, PlantillaEjercicios } from "../../types";
import { CURSO_DEMO_SLUG } from "../../usuario-demo";
import type { Db } from "../client";
import {
  categoria,
  clase,
  concepto,
  cuenta,
  curso,
  cursoImagen,
  matricula,
  modulo,
  plantillaEjercicio,
  progreso,
  usuario,
} from "../schema";
import {
  BANNERS_CURSO,
  CONTRASENA_DEMO,
  USUARIO_IA_FORO,
  construirCatalogos,
  construirMatriculas,
  construirPlantillas,
  construirUsuarios,
} from "./datos";

/** Ejemplos del profesor de cada módulo del curso de la demo (#12): origen de `plantilla_ejercicio`. */
const PLANTILLAS_DEMO = [m1Html, m2Css, m3Responsive, m4Javascript] as PlantillaEjercicios[];

/** En ON CONFLICT DO UPDATE: el valor que se intentaba insertar. */
const nuevo = (columna: string) => sql.raw(`excluded.${columna}`);

export type RecuentoSeed = Record<
  | "categoria"
  | "curso"
  | "modulo"
  | "concepto"
  | "clase"
  | "usuario"
  | "cuenta"
  | "matricula"
  | "progreso"
  | "plantilla_ejercicio"
  | "curso_imagen",
  number
>;

export async function sembrar(db: Db): Promise<RecuentoSeed> {
  const catalogos = construirCatalogos(catalogoJson as Catalogo);
  const usuarios = construirUsuarios(alumnosDemo);
  // El curso de la demo es el primero (construirCatalogos). Se construyen antes de abrir la transacción:
  // si un fichero de ejemplos está mal, el seed falla sin haber escrito nada.
  const plantillas = construirPlantillas(catalogos[0], PLANTILLAS_DEMO);
  // Se cifra una vez (fuera de la transacción): todas las cuentas del seed comparten contraseña.
  const passwordHash = await cifrarContrasena(CONTRASENA_DEMO);

  await db.transaction(async (tx) => {
    const cursoIds = new Map<string, string>();
    const moduloIds = new Map<string, string>(); // "curso/modulo" → id

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

      // Banner del curso para las tarjetas: solo la URL. Sin clave natural en la tabla, se busca antes de insertar.
      const banner = BANNERS_CURSO[catalogo.curso.slug];
      if (banner) {
        const [existe] = await tx
          .select({ id: cursoImagen.id })
          .from(cursoImagen)
          .where(and(eq(cursoImagen.cursoId, cur.id), eq(cursoImagen.uso, "banner"), eq(cursoImagen.url, banner)))
          .limit(1);
        if (!existe) {
          await tx.insert(cursoImagen).values({ cursoId: cur.id, url: banner, titulo: "Banner de la tarjeta del curso", uso: "banner" });
        }
      }

      for (const m of catalogo.modulos) {
        const [mod] = await tx
          .insert(modulo)
          .values({ cursoId: cur.id, slug: m.slug, titulo: m.titulo, descripcion: m.descripcion, ordenSugerido: m.ordenSugerido })
          .onConflictDoUpdate({
            target: [modulo.cursoId, modulo.slug],
            set: { titulo: nuevo("titulo"), descripcion: nuevo("descripcion"), ordenSugerido: nuevo("orden_sugerido") },
          })
          .returning({ id: modulo.id });
        moduloIds.set(`${catalogo.curso.slug}/${m.slug}`, mod.id);

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

    // Plantillas de ejercicios del profesor: una por módulo. Si ya existe, se deja como dice el fichero,
    // porque sin panel de administración el fichero es donde el profesor configura su módulo.
    if (plantillas.length > 0) {
      await tx
        .insert(plantillaEjercicio)
        .values(
          plantillas.map((p) => ({
            moduloId: moduloIds.get(`${p.cursoSlug}/${p.moduloSlug}`)!,
            tipos: p.tipos,
            ejemplos: p.ejemplos,
            indicaciones: p.indicaciones,
          })),
        )
        .onConflictDoUpdate({
          target: plantillaEjercicio.moduloId,
          set: { tipos: nuevo("tipos"), ejemplos: nuevo("ejemplos"), indicaciones: nuevo("indicaciones") },
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
      .returning({ id: usuario.id, email: usuario.email });
    const usuarioIds = new Map(filas.map((u) => [u.email, u.id]));

    // Sensei, la IA del foro: aparte de los usuarios de la demo para que no tenga cuenta ni matrículas.
    await tx
      .insert(usuario)
      .values(USUARIO_IA_FORO)
      .onConflictDoUpdate({ target: usuario.email, set: { nombre: nuevo("nombre"), imagenUrl: nuevo("imagen_url") } });

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
    // Progreso de demostración (src/lib/datos-prueba.ts) en el curso de la demo, para que «Tus cursos» no salga al 0 %.
    // Si ya hay progreso de ese módulo no se toca: puede ser progreso real del alumno.
    const emailDe = new Map(alumnosDemo.map((a) => [a.id, a.email.toLowerCase()]));
    const progresos = progresoDemo.map((p) => ({
      usuarioId: usuarioIds.get(emailDe.get(p.alumnoId)!)!,
      moduloId: moduloIds.get(`${CURSO_DEMO_SLUG}/${p.moduloId}`)!,
      estado: p.estado,
      aciertosPorConcepto: p.aciertosPorConcepto,
    }));
    if (progresos.length > 0) {
      await tx.insert(progreso).values(progresos).onConflictDoNothing({ target: [progreso.usuarioId, progreso.moduloId] });
    }

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
    progreso: await contar(progreso),
    plantilla_ejercicio: await contar(plantillaEjercicio),
    curso_imagen: await contar(cursoImagen),
  };
}
