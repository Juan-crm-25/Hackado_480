import "server-only";
import { and, count, eq, inArray, max } from "drizzle-orm";
import type { Correccion, PreguntaCorregible } from "@/lib/agentes/corrector";
import type { EjercicioGenerado } from "@/lib/agentes/ejercicios";
import { getDb, type Db } from "@/lib/db/client";
import {
  clase,
  concepto,
  curso,
  ejercicio,
  evaluacion,
  intento,
  intentoEvaluacion,
  modulo,
  plantillaEjercicio,
  progreso,
} from "@/lib/db/schema";
import { NOTA_APROBADO, aciertosPorConcepto, estadoTrasTest } from "@/lib/test-modulo";
import type { EstadoModulo, PlantillaEjercicios, TipoEjercicio, UsoEjercicio } from "@/lib/types";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";

/** Plantilla del profesor de un módulo, con el id del módulo en la BBDD (para guardar sus ejercicios). */
export interface PlantillaDelModulo {
  moduloId: string;
  plantilla: PlantillaEjercicios;
}

/**
 * Plantilla de ejercicios de un módulo, buscado por su slug dentro de un curso (por defecto, el de la demo).
 * Devuelve null si el módulo no existe o no tiene plantilla.
 */
export async function leerPlantillaDelModulo(
  moduloSlug: string,
  cursoSlug: string = CURSO_DEMO_SLUG,
  db: Db = getDb(),
): Promise<PlantillaDelModulo | null> {
  const [fila] = await db
    .select({
      moduloId: modulo.id,
      tipos: plantillaEjercicio.tipos,
      ejemplos: plantillaEjercicio.ejemplos,
      indicaciones: plantillaEjercicio.indicaciones,
    })
    .from(modulo)
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .innerJoin(plantillaEjercicio, eq(plantillaEjercicio.moduloId, modulo.id))
    .where(and(eq(curso.slug, cursoSlug), eq(modulo.slug, moduloSlug)))
    .limit(1);
  if (!fila) return null;

  const plantilla: PlantillaEjercicios = { moduloId: moduloSlug, tipos: fila.tipos, ejemplos: fila.ejemplos };
  if (fila.indicaciones !== null) plantilla.indicaciones = fila.indicaciones;
  return { moduloId: fila.moduloId, plantilla };
}

/** Cuántos ejercicios tiene un módulo en cada estado (solo los de un uso, si se pide). */
export async function contarEjercicios(
  moduloId: string,
  opciones: { uso?: UsoEjercicio } = {},
  db: Db = getDb(),
): Promise<{ borrador: number; aprobado: number }> {
  const filas = await db
    .select({ estado: ejercicio.estado, total: count() })
    .from(ejercicio)
    .where(and(eq(ejercicio.moduloId, moduloId), opciones.uso ? eq(ejercicio.uso, opciones.uso) : undefined))
    .groupBy(ejercicio.estado);
  const de = (estado: string) => filas.find((f) => f.estado === estado)?.total ?? 0;
  return { borrador: de("borrador"), aprobado: de("aprobado") };
}

/**
 * Guarda los ejercicios de un módulo como borrador, en una transacción. Traduce el concepto y el vídeo de cada uno
 * (sus slugs, p. ej. "css-especificidad" y "v04") a los ids de la BBDD; si alguno no es de ese módulo, falla sin
 * guardar ninguno. Con `reemplazar`, antes borra los borradores del módulo de los mismos usos que los nuevos
 * (regenerar las preguntas de vídeo no toca las del módulo ni las de examen): los aprobados no se tocan nunca.
 * Devuelve cuántos ha guardado.
 */
export async function guardarBorradores(
  moduloId: string,
  ejercicios: EjercicioGenerado[],
  opciones: { reemplazar?: boolean } = {},
  db: Db = getDb(),
): Promise<number> {
  return db.transaction(async (tx) => {
    const [conceptos, clases] = await Promise.all([
      tx.select({ id: concepto.id, slug: concepto.slug }).from(concepto).where(eq(concepto.moduloId, moduloId)),
      tx.select({ id: clase.id, slug: clase.slug }).from(clase).where(eq(clase.moduloId, moduloId)),
    ]);
    const conceptoId = new Map(conceptos.map((c) => [c.slug, c.id]));
    const claseId = new Map(clases.map((c) => [c.slug, c.id]));

    // Se resuelven todos antes de escribir nada.
    const filas = ejercicios.map((e) => {
      const idConcepto = conceptoId.get(e.conceptoId);
      if (!idConcepto) throw new Error(`El concepto "${e.conceptoId}" no es del módulo.`);
      const idClase = claseId.get(e.referencia.videoId);
      if (!idClase) throw new Error(`El vídeo "${e.referencia.videoId}" no es del módulo.`);
      return {
        moduloId,
        conceptoId: idConcepto,
        claseId: idClase,
        segundoReferencia: e.referencia.segundo,
        tipo: e.tipo,
        uso: e.uso,
        enunciado: e.enunciado,
        opciones: e.opciones ?? null,
        solucion: e.solucion ?? null,
        rubrica: e.rubrica ?? null,
        estado: "borrador" as const,
      };
    });

    const usos = [...new Set(ejercicios.map((e) => e.uso))];
    if (opciones.reemplazar && usos.length > 0) {
      await tx
        .delete(ejercicio)
        .where(and(eq(ejercicio.moduloId, moduloId), eq(ejercicio.estado, "borrador"), inArray(ejercicio.uso, usos)));
    }
    if (filas.length > 0) await tx.insert(ejercicio).values(filas);
    return filas.length;
  });
}

// ─── Test del módulo (#3) ────────────────────────────────────────────────────

/** Un ejercicio aprobado del banco, listo para enseñarlo (sin solución) o corregirlo. Concepto y vídeo por su slug. */
export interface PreguntaDelBanco extends PreguntaCorregible {
  id: string;
  conceptoId: string;
  /** Id de la clase en la BBDD (para guardar el momento que hay que repasar). */
  claseId: string;
}

/** Ejercicios APROBADOS de un módulo con ese uso (`modulo`, `video` o `examen`). */
export async function leerBancoAprobado(moduloId: string, uso: UsoEjercicio, db: Db = getDb()): Promise<PreguntaDelBanco[]> {
  const filas = await db
    .select({
      id: ejercicio.id,
      concepto: concepto.slug,
      claseId: clase.id,
      video: clase.slug,
      segundo: ejercicio.segundoReferencia,
      tipo: ejercicio.tipo,
      enunciado: ejercicio.enunciado,
      opciones: ejercicio.opciones,
      solucion: ejercicio.solucion,
      rubrica: ejercicio.rubrica,
    })
    .from(ejercicio)
    .innerJoin(concepto, eq(concepto.id, ejercicio.conceptoId))
    .innerJoin(clase, eq(clase.id, ejercicio.claseId))
    .where(and(eq(ejercicio.moduloId, moduloId), eq(ejercicio.uso, uso), eq(ejercicio.estado, "aprobado")))
    .orderBy(ejercicio.creado, ejercicio.id);
  return filas.map((f) => {
    const p: PreguntaDelBanco = {
      id: f.id,
      conceptoId: f.concepto,
      claseId: f.claseId,
      tipo: f.tipo as TipoEjercicio,
      enunciado: f.enunciado,
      referencia: { videoId: f.video, segundo: f.segundo },
    };
    if (f.opciones) p.opciones = f.opciones;
    if (f.solucion !== null && f.solucion !== undefined) p.solucion = f.solucion;
    if (f.rubrica) p.rubrica = f.rubrica;
    return p;
  });
}

export interface TestCorregido {
  usuarioId: string;
  moduloId: string;
  nota: number;
  aprobado: boolean;
  resultados: { pregunta: PreguntaDelBanco; respuesta: string | number; correccion: Correccion }[];
}

/**
 * Guarda un test del módulo ya corregido, en una transacción: cada respuesta en `intento` (también las usa el Radar),
 * el test entero en `intento_evaluacion` (con la fila de `evaluacion` del test del módulo, que crea la primera vez) y
 * el `progreso` del módulo. Cuenta el MEJOR intento: el estado nunca baja y los aciertos por concepto son los del
 * intento con mejor nota. Devuelve la mejor nota y el estado del módulo.
 */
export async function guardarTestModulo(
  test: TestCorregido,
  db: Db = getDb(),
): Promise<{ mejorNota: number; estado: EstadoModulo }> {
  return db.transaction(async (tx) => {
    const evaluacionId = await evaluacionDelModulo(test.moduloId, tx);
    const [anterior] = await tx
      .select({ mejor: max(intentoEvaluacion.nota) })
      .from(intentoEvaluacion)
      .where(and(eq(intentoEvaluacion.usuarioId, test.usuarioId), eq(intentoEvaluacion.evaluacionId, evaluacionId)));
    const mejorAnterior = anterior?.mejor === null || anterior?.mejor === undefined ? null : Number(anterior.mejor);

    if (test.resultados.length > 0) await tx.insert(intento).values(filasIntento(test.usuarioId, test.resultados));
    await tx.insert(intentoEvaluacion).values({
      usuarioId: test.usuarioId,
      evaluacionId,
      respuestas: Object.fromEntries(test.resultados.map((r) => [r.pregunta.id, r.respuesta])),
      nota: test.nota,
      aprobado: test.aprobado,
    });

    const [actual] = await tx
      .select({ estado: progreso.estado, aciertos: progreso.aciertosPorConcepto })
      .from(progreso)
      .where(and(eq(progreso.usuarioId, test.usuarioId), eq(progreso.moduloId, test.moduloId)));
    const esElMejor = mejorAnterior === null || test.nota >= mejorAnterior;
    const estado = estadoTrasTest(actual?.estado ?? null, test.aprobado);
    const aciertos =
      esElMejor || !actual
        ? aciertosPorConcepto(test.resultados.map((r) => ({ conceptoId: r.pregunta.conceptoId, puntuacion: r.correccion.puntuacion })))
        : actual.aciertos;
    await tx
      .insert(progreso)
      .values({ usuarioId: test.usuarioId, moduloId: test.moduloId, estado, aciertosPorConcepto: aciertos })
      .onConflictDoUpdate({
        target: [progreso.usuarioId, progreso.moduloId],
        set: { estado, aciertosPorConcepto: aciertos, actualizado: new Date() },
      });

    return { mejorNota: esElMejor ? test.nota : (mejorAnterior as number), estado };
  });
}

/** Las filas de `intento` de unas respuestas corregidas. */
function filasIntento(usuarioId: string, resultados: TestCorregido["resultados"]) {
  return resultados.map(({ pregunta, respuesta, correccion }) => ({
    usuarioId,
    ejercicioId: pregunta.id,
    respuesta,
    puntuacion: correccion.puntuacion,
    correcto: correccion.correcto,
    feedback: correccion.feedback,
    repasarClaseId: correccion.repasar ? pregunta.claseId : null,
    repasarSegundo: correccion.repasar ? correccion.repasar.segundo : null,
    revisionHumana: correccion.revisionHumana,
  }));
}

/**
 * Guarda las respuestas del test de un vídeo en `intento` (también las usa el Radar) y, si el alumno no había empezado
 * el módulo, lo pasa a «en curso». Nunca baja el estado (dominado o completado se quedan).
 */
export async function guardarTestVideo(
  usuarioId: string,
  moduloId: string,
  resultados: TestCorregido["resultados"],
  db: Db = getDb(),
): Promise<void> {
  await db.transaction(async (tx) => {
    if (resultados.length > 0) await tx.insert(intento).values(filasIntento(usuarioId, resultados));
    await tx
      .insert(progreso)
      .values({ usuarioId, moduloId, estado: "en_curso" })
      .onConflictDoUpdate({
        target: [progreso.usuarioId, progreso.moduloId],
        set: { estado: "en_curso", actualizado: new Date() },
        setWhere: eq(progreso.estado, "pendiente"),
      });
  });
}

/** Id de la fila de `evaluacion` del test del módulo; la crea la primera vez que alguien hace el test. */
async function evaluacionDelModulo(moduloId: string, db: Pick<Db, "select" | "insert">): Promise<string> {
  const [hay] = await db
    .select({ id: evaluacion.id })
    .from(evaluacion)
    .where(and(eq(evaluacion.moduloId, moduloId), eq(evaluacion.tipo, "test")))
    .limit(1);
  if (hay) return hay.id;
  const [m] = await db.select({ cursoId: modulo.cursoId, titulo: modulo.titulo }).from(modulo).where(eq(modulo.id, moduloId));
  const [nueva] = await db
    .insert(evaluacion)
    .values({ cursoId: m.cursoId, moduloId, tipo: "test", titulo: `Test del módulo «${m.titulo}»`, notaAprobado: NOTA_APROBADO })
    .returning({ id: evaluacion.id });
  return nueva.id;
}
