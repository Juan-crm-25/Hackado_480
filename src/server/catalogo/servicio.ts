import "server-only";
import type { CursoCatalogo, CursoPublico, CursoResumen, ModuloCatalogo } from "@/lib/catalogo-bd";
import { getDb, type Db } from "@/lib/db/client";
import { leerCursoPrincipal, leerCursoPublicado, leerCursosPublicados } from "./repositorio";

export type ResultadoCurso = { estado: "ok"; curso: CursoCatalogo } | { estado: "vacio" } | { estado: "error" };

/**
 * Curso principal para las pantallas. Nunca lanza: si no hay BBDD (sin DATABASE_URL o sin conexión)
 * devuelve `error`, y si la BBDD está vacía, `vacio`; la pantalla muestra el estado que toque.
 * `obtenerDb` se pasa como función porque getDb() ya lanza cuando falta DATABASE_URL.
 */
export async function cargarCursoPrincipal(obtenerDb: () => Db = getDb): Promise<ResultadoCurso> {
  try {
    const curso = await leerCursoPrincipal(obtenerDb());
    return curso ? { estado: "ok", curso } : { estado: "vacio" };
  } catch (error) {
    console.error("[catalogo] No se pudo leer el curso de la BBDD:", error);
    return { estado: "error" };
  }
}

export type ResultadoCursos = { estado: "ok"; cursos: CursoResumen[] } | { estado: "vacio" } | { estado: "error" };

/** Cursos publicados para la home pública. Nunca lanza (igual que cargarCursoPrincipal). */
export async function cargarCursosPublicados(obtenerDb: () => Db = getDb): Promise<ResultadoCursos> {
  try {
    const cursos = await leerCursosPublicados(obtenerDb());
    return cursos.length > 0 ? { estado: "ok", cursos } : { estado: "vacio" };
  } catch (error) {
    console.error("[catalogo] No se pudieron leer los cursos de la BBDD:", error);
    return { estado: "error" };
  }
}

export type ResultadoCursoPublico = { estado: "ok"; curso: CursoPublico } | { estado: "no-encontrado" } | { estado: "error" };

/** Página pública de un curso por su slug. Nunca lanza: `no-encontrado` si no existe o no está publicado. */
export async function cargarCursoPublico(slug: string, obtenerDb: () => Db = getDb): Promise<ResultadoCursoPublico> {
  try {
    const curso = await leerCursoPublicado(slug, obtenerDb());
    return curso ? { estado: "ok", curso } : { estado: "no-encontrado" };
  } catch (error) {
    console.error("[catalogo] No se pudo leer el curso de la BBDD:", error);
    return { estado: "error" };
  }
}

/** Módulo del curso por su id (el slug de la URL, p. ej. "m2-css"). */
export function buscarModulo(curso: CursoCatalogo, id: string): ModuloCatalogo | undefined {
  return curso.modulos.find((m) => m.id === id);
}
