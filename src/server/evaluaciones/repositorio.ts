import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { curso, evaluacion, intentoEvaluacion, modulo, preguntaEvaluacion, progreso } from "@/lib/db/schema";

/** Localiza un módulo por su slug junto con el slug e id de su curso. */
export async function leerModuloConCurso(moduloSlug: string, db: Db) {
  const [fila] = await db
    .select({
      moduloId: modulo.id,
      moduloSlug: modulo.slug,
      moduloTitulo: modulo.titulo,
      cursoId: curso.id,
      cursoSlug: curso.slug,
    })
    .from(modulo)
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .where(eq(modulo.slug, moduloSlug))
    .limit(1);
  return fila ?? null;
}

/** Lee la evaluación de tipo diagnóstico de un módulo y sus preguntas ordenadas, si existen en BBDD. */
export async function leerDiagnosticoEnBd(moduloId: string, db: Db) {
  const [evalFila] = await db
    .select({ id: evaluacion.id, titulo: evaluacion.titulo })
    .from(evaluacion)
    .where(and(eq(evaluacion.moduloId, moduloId), eq(evaluacion.tipo, "diagnostico")))
    .limit(1);
  if (!evalFila) return null;

  const preguntas = await db
    .select({
      id: preguntaEvaluacion.id,
      orden: preguntaEvaluacion.orden,
      enunciado: preguntaEvaluacion.enunciado,
      opciones: preguntaEvaluacion.opciones,
      solucion: preguntaEvaluacion.solucion,
    })
    .from(preguntaEvaluacion)
    .where(eq(preguntaEvaluacion.evaluacionId, evalFila.id))
    .orderBy(asc(preguntaEvaluacion.orden));

  return { evaluacionId: evalFila.id, preguntas };
}

/** Lee el estado actual del alumno en un módulo, o null si aún no tiene fila en progreso. */
export async function leerEstadoModulo(usuarioId: string, moduloId: string, db: Db) {
  const [fila] = await db
    .select({ estado: progreso.estado })
    .from(progreso)
    .where(and(eq(progreso.usuarioId, usuarioId), eq(progreso.moduloId, moduloId)))
    .limit(1);
  return fila?.estado ?? null;
}

/** Marca el módulo como dominado en progreso (crea o actualiza la fila). */
export async function marcarModuloDominado(usuarioId: string, moduloId: string, db: Db): Promise<void> {
  const ahora = new Date();
  await db
    .insert(progreso)
    .values({ usuarioId, moduloId, estado: "dominado", actualizado: ahora })
    .onConflictDoUpdate({
      target: [progreso.usuarioId, progreso.moduloId],
      set: { estado: "dominado", actualizado: ahora },
    });
}

/** Registra el intento de diagnóstico cuando existe fila en `evaluacion`. */
export async function guardarIntentoDiagnostico(
  datos: {
    usuarioId: string;
    evaluacionId: string;
    respuestas: Record<string, number>;
    nota: number;
    aprobado: boolean;
  },
  db: Db,
): Promise<void> {
  await db.insert(intentoEvaluacion).values({
    usuarioId: datos.usuarioId,
    evaluacionId: datos.evaluacionId,
    respuestas: datos.respuestas,
    nota: datos.nota,
    aprobado: datos.aprobado,
  });
}