import "server-only";
import { ErrorIA } from "@/lib/ai/cliente";
import { ErrorAnalista, resumirDudas } from "@/lib/agentes/analista";
import { getDb, type Db } from "@/lib/db/client";
import type { InformeRadar, RespuestaResumenDudas } from "@/lib/types";
import type { UsuarioSesion } from "../auth/roles";
import { errorIa } from "../compartido/errores";
import { requerirProfesorDelCurso } from "../matriculas/servicio";
import { agruparDudas, calcularRadar } from "./calculo";
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

// ─── Resumen de dudas con IA (agente analista) ──────────────────────────────

const HORA = 3600 * 1000;
const DURACION_CACHE = HORA;

/**
 * Caché en memoria por curso: si no hay preguntas nuevas, no se vuelve a llamar a la IA (como mucho, una vez por hora).
 * En Vercel cada instancia tiene la suya: en el peor caso se repite una llamada barata, nunca se da un dato de otro curso.
 */
const cacheResumen = new Map<string, { firma: string; caduca: number; respuesta: RespuestaResumenDudas }>();

/** Solo para tests. */
export function vaciarCacheResumen(): void {
  cacheResumen.clear();
}

export interface DependenciasResumen {
  resumir: typeof resumirDudas;
}

/**
 * Resumen de las dudas al tutor de un curso para su profesor (#5). Mismos permisos que el Radar.
 * Al analista solo le llegan los textos de las preguntas (ya filtrados) agrupados por módulo, y los conceptos
 * más fallados: nunca quién preguntó. Si la IA falla: ERROR_IA (502), y el resto del Radar sigue funcionando.
 */
export async function obtenerResumenDudas(
  usuario: UsuarioSesion,
  cursoSlug: string,
  db: Db = getDb(),
  deps: DependenciasResumen = { resumir: resumirDudas },
  ahora = new Date(),
): Promise<RespuestaResumenDudas> {
  const curso = await requerirProfesorDelCurso(usuario, cursoSlug, db);
  const datos = await leerDatosRadar(curso.id, new Date(ahora.getTime() - DIAS_ATRAS * 24 * HORA), db);
  const informe = calcularRadar({ curso: { slug: curso.slug, titulo: curso.titulo }, ...datos }, ahora);
  const dudas = agruparDudas(datos.dudas, datos.modulos, ahora);

  // Firma de las dudas: si cambia (preguntas nuevas), la caché ya no vale.
  const firma = JSON.stringify(dudas.map((d) => [d.moduloId, d.total, d.masRepetidas.map((p) => [p.texto, p.veces])]));
  const guardada = cacheResumen.get(curso.id);
  if (guardada && guardada.firma === firma && guardada.caduca > ahora.getTime()) return guardada.respuesta;

  let resumen: string;
  try {
    ({ resumen } = await deps.resumir({
      curso: curso.titulo,
      fallados: informe.conceptosMasFallados.map((c) => ({
        concepto: c.concepto,
        modulo: informe.modulos.find((m) => m.id === c.moduloId)?.titulo ?? c.moduloId,
        porcentajeFallo: c.porcentajeFallo,
      })),
      dudas: dudas.map((d) => ({ modulo: d.modulo, preguntas: d.masRepetidas })),
    }));
  } catch (e) {
    if (e instanceof ErrorAnalista || e instanceof ErrorIA) throw errorIa("No se ha podido preparar el resumen de dudas. Inténtalo de nuevo.");
    throw e;
  }

  const respuesta = { resumen, generado: ahora.toISOString() };
  cacheResumen.set(curso.id, { firma, caduca: ahora.getTime() + DURACION_CACHE, respuesta });
  return respuesta;
}
