import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import type { InformeRadar } from "@/lib/types";
import type { UsuarioSesion } from "../auth/roles";
import { requerirProfesorDelCurso } from "../matriculas/servicio";
import { calcularRadar } from "./calculo";
import { leerDatosRadar } from "./repositorio";

/** Hasta dónde mira el Radar hacia atrás (los conceptos más fallados usan 30 días). */
const DIAS_ATRAS = 30;

/**
 * Radar del tutor de un curso (#5). Solo para el profesor de ESE curso o un admin (403 si no; 404 si no existe).
 * Los números los calcula el código (calculo.ts); la IA no interviene aquí.
 */
export async function obtenerRadar(usuario: UsuarioSesion, cursoSlug: string, db: Db = getDb(), ahora = new Date()): Promise<InformeRadar> {
  const curso = await requerirProfesorDelCurso(usuario, cursoSlug, db);
  const datos = await leerDatosRadar(curso.id, new Date(ahora.getTime() - DIAS_ATRAS * 24 * 3600 * 1000), db);
  return calcularRadar({ curso: { slug: curso.slug, titulo: curso.titulo }, ...datos }, ahora);
}
