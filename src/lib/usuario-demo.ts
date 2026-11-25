/**
 * TEMPORAL: usuario y progreso de demostración hasta que exista el login (Better Auth).
 * Es el único sitio de la interfaz que decide quién es «el usuario actual»; cuando haya sesión,
 * se sustituye por la sesión y el progreso real sin tocar las pantallas.
 */
import { alumnosDemo, progresoDemo } from "./datos-prueba";
import type { Alumno, Progreso } from "./types";

export function getUsuarioDemo(): Alumno {
  return alumnosDemo[0];
}

/** El mismo origen de datos que GET /api/progreso mientras no haya BBDD. */
export function getProgresoDemo(alumnoId: string): Progreso[] {
  return progresoDemo.filter((p) => p.alumnoId === alumnoId);
}

/**
 * Curso del usuario de demostración (el de data/catalog.json): el que ve en /dashboard y en los módulos.
 * Con login saldrá de sus matrículas.
 */
export const CURSO_DEMO_SLUG = "desarrollo-web";
