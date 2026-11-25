import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import { porcentajeCompletado } from "@/lib/progreso";
import {
  aplicarOrden,
  ordenarRuta,
  recomendacionTutor,
  VALORACION_POR_DEFECTO,
  type ModuloDeRuta,
  type RespuestaRuta,
  type RutaDelCurso,
} from "@/lib/ruta";
import type { Progreso } from "@/lib/types";
import type { UsuarioSesion } from "../auth/roles";
import { datosInvalidos, noEncontrado, prohibido } from "../compartido/errores";
import type { DatosRuta } from "./esquemas";
import {
  existeMatriculaDelUsuario,
  guardarRutaDeMatricula,
  leerCursoPorSlug,
  leerCursosDelUsuario,
  leerMatriculaDelUsuario,
  leerModulosDelCurso,
  leerProgresoDelCurso,
  type FilaCursoDelUsuario,
} from "./repositorio";

export type CursoDelUsuario = FilaCursoDelUsuario & { porcentaje: number };

export type ResultadoCursosDelUsuario = { estado: "ok"; cursos: CursoDelUsuario[] } | { estado: "vacio" } | { estado: "error" };

/**
 * «Tus cursos»: los cursos del usuario con el porcentaje completado. Nunca lanza (como los de catálogo):
 * sin BBDD devuelve `error` y sin matrículas, `vacio`.
 */
export async function cargarCursosDelUsuario(
  usuarioId: string,
  obtenerDb: () => Db = getDb,
): Promise<ResultadoCursosDelUsuario> {
  try {
    const filas = await leerCursosDelUsuario(usuarioId, obtenerDb());
    if (filas.length === 0) return { estado: "vacio" };
    return {
      estado: "ok",
      cursos: filas.map((c) => ({ ...c, porcentaje: porcentajeCompletado(c.modulosCompletados, c.totalModulos) })),
    };
  } catch (error) {
    console.error("[matriculas] No se pudieron leer los cursos del usuario:", error);
    return { estado: "error" };
  }
}

/** ¿Tiene el usuario este curso? Para elegir entre «Inscribirme» e «Ir a tu curso». Sin BBDD, false. */
export async function tieneElCurso(usuarioId: string, slug: string, obtenerDb: () => Db = getDb): Promise<boolean> {
  try {
    return await existeMatriculaDelUsuario(usuarioId, slug, obtenerDb());
  } catch (error) {
    console.error("[matriculas] No se pudo comprobar la matrícula:", error);
    return false;
  }
}

// ─── Ruta personalizada (cursos no lineales) ────────────────────────────────

export type { RespuestaRuta, RutaDelCurso };

/** Curso, matrícula del usuario y módulos. 404 si el curso no existe; 403 si no lo tiene. */
async function cargarCursoDelAlumno(usuario: UsuarioSesion, slug: string, db: Db) {
  const curso = await leerCursoPorSlug(slug, db);
  if (!curso) throw noEncontrado("No encontramos ese curso");
  const matricula = await leerMatriculaDelUsuario(usuario.id, curso.id, db);
  if (!matricula) throw prohibido("No tienes este curso");
  const modulos = await leerModulosDelCurso(curso.id, db);
  return { curso, matricula, modulos };
}

const sinUuid = ({ id, titulo, descripcion }: ModuloDeRuta): ModuloDeRuta => ({ id, titulo, descripcion });

/** Los módulos del curso en el orden del profesor (para valorarlos) y la ruta del alumno si ya la hizo. */
export async function obtenerRuta(usuario: UsuarioSesion, slug: string, db: Db = getDb()): Promise<RutaDelCurso> {
  const { curso, matricula, modulos } = await cargarCursoDelAlumno(usuario, slug, db);
  const slugDe = new Map(modulos.map((m) => [m.uuid, m.id]));
  const orden = (matricula.ordenModulos ?? []).map((uuid) => slugDe.get(uuid)).filter((s): s is string => !!s);
  return {
    curso: { slug: curso.slug, titulo: curso.titulo },
    personalizada: orden.length > 0,
    orden: orden.length > 0 ? aplicarOrden(modulos, orden).map((m) => m.id) : null,
    principal: (matricula.moduloPrincipalId && slugDe.get(matricula.moduloPrincipalId)) ?? null,
    modulos: modulos.map(sinUuid),
  };
}

/**
 * Ordena el curso con las valoraciones del alumno (src/lib/ruta.ts), guarda la ruta en su matrícula y devuelve
 * la recomendación del tutor. «Ya lo sé» solo manda el módulo al final: el dominado llega al aprobar su test.
 * Las valoraciones no se guardan.
 */
export async function guardarRuta(
  usuario: UsuarioSesion,
  slug: string,
  datos: DatosRuta,
  db: Db = getDb(),
): Promise<RespuestaRuta> {
  const { curso, matricula, modulos } = await cargarCursoDelAlumno(usuario, slug, db);
  const slugs = new Set(modulos.map((m) => m.id));
  if (Object.keys(datos.valoraciones).some((id) => !slugs.has(id))) {
    throw datosInvalidos(undefined, "Hay módulos que no son de este curso");
  }

  const { orden, principal } = ordenarRuta(modulos, datos.valoraciones);
  const valoracion = (id: string) =>
    (Object.hasOwn(datos.valoraciones, id) ? datos.valoraciones[id] : undefined) ?? VALORACION_POR_DEFECTO;
  await guardarRutaDeMatricula(
    { matriculaId: matricula.id, orden: orden.map((m) => m.uuid), principalId: principal?.uuid ?? null },
    db,
  );

  return {
    curso: { slug: curso.slug, titulo: curso.titulo },
    principal: principal?.id ?? null,
    modulos: orden.map((m) => ({ ...sinUuid(m), valoracion: valoracion(m.id) })),
    recomendacion: recomendacionTutor(orden, datos.valoraciones),
  };
}

export type AvanceDelCurso = { orden: string[] | null; principal: string | null; progreso: Progreso[] };

/** Ruta y progreso del alumno en un curso, para el panel. Nunca lanza: sin BBDD o sin matrícula, vacío. */
export async function cargarAvanceDelCurso(
  usuarioId: string,
  slug: string,
  obtenerDb: () => Db = getDb,
): Promise<AvanceDelCurso> {
  const vacio: AvanceDelCurso = { orden: null, principal: null, progreso: [] };
  try {
    const db = obtenerDb();
    const curso = await leerCursoPorSlug(slug, db);
    if (!curso) return vacio;
    const matricula = await leerMatriculaDelUsuario(usuarioId, curso.id, db);
    if (!matricula) return vacio;
    const [modulos, filas] = await Promise.all([leerModulosDelCurso(curso.id, db), leerProgresoDelCurso(usuarioId, curso.id, db)]);
    const slugDe = new Map(modulos.map((m) => [m.uuid, m.id]));
    const orden = (matricula.ordenModulos ?? []).map((uuid) => slugDe.get(uuid)).filter((s): s is string => !!s);
    return {
      orden: orden.length > 0 ? orden : null,
      principal: (matricula.moduloPrincipalId && slugDe.get(matricula.moduloPrincipalId)) ?? null,
      progreso: filas.map((p) => ({
        alumnoId: usuarioId,
        moduloId: p.moduloId,
        estado: p.estado,
        aciertosPorConcepto: p.aciertosPorConcepto,
        actualizado: p.actualizado.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[matriculas] No se pudo leer el avance del curso:", error);
    return vacio;
  }
}

