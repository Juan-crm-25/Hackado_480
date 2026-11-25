import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import { porcentajeCompletado } from "@/lib/progreso";
import { existeMatriculaDelUsuario, leerCursosDelUsuario, type FilaCursoDelUsuario } from "./repositorio";

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
