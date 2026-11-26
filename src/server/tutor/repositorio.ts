import "server-only";
import { and, asc, desc, eq, gt, isNull, sql, type SQL } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { conversacion, curso, dudaHumana, mensaje, modulo, usoIa, usuario } from "@/lib/db/schema";
import type { ReferenciaVideo } from "@/lib/types";

/** Una pregunta del alumno y la respuesta del tutor. Los textos tienen que llegar YA FILTRADOS. */
export interface Intercambio {
  usuarioId: string;
  moduloId: string;
  pregunta: string;
  respuesta: { texto: string; fuentes: ReferenciaVideo[] };
}

/**
 * Guarda el intercambio en la conversación vigente del alumno en ese módulo (la crea si no hay
 * ninguna sin caducar). Todo en una transacción: o se guardan los dos mensajes o ninguno.
 */
export async function guardarIntercambio(
  intercambio: Intercambio,
  db: Db = getDb(),
): Promise<{ conversacionId: string; preguntaId: string }> {
  return db.transaction(async (tx) => {
    // Bloquea al alumno: dos preguntas a la vez no crean dos conversaciones.
    await tx.select({ id: usuario.id }).from(usuario).where(eq(usuario.id, intercambio.usuarioId)).for("update");

    const [vigente] = await tx
      .select({ id: conversacion.id })
      .from(conversacion)
      .where(
        and(
          eq(conversacion.usuarioId, intercambio.usuarioId),
          eq(conversacion.moduloId, intercambio.moduloId),
          gt(conversacion.caduca, sql`now()`),
        ),
      )
      .orderBy(desc(conversacion.creada))
      .limit(1);

    const conversacionId =
      vigente?.id ??
      (
        await tx
          .insert(conversacion)
          .values({ usuarioId: intercambio.usuarioId, moduloId: intercambio.moduloId })
          .returning({ id: conversacion.id })
      )[0].id;

    // Fechas explícitas para que la respuesta quede siempre después de la pregunta.
    const ahora = Date.now();
    const [pregunta] = await tx.insert(mensaje).values([
      { conversacionId, rol: "alumno", texto: intercambio.pregunta, fecha: new Date(ahora) },
      {
        conversacionId,
        rol: "tutor",
        texto: intercambio.respuesta.texto,
        fuentes: intercambio.respuesta.fuentes,
        fecha: new Date(ahora + 1),
      },
    ]).returning({ id: mensaje.id });

    return { conversacionId, preguntaId: pregunta.id };
  });
}

/** Mensajes de una conversación, del más antiguo al más reciente. */
export async function listarMensajes(conversacionId: string, db: Db = getDb()) {
  return db
    .select({ rol: mensaje.rol, texto: mensaje.texto, fuentes: mensaje.fuentes, fecha: mensaje.fecha })
    .from(mensaje)
    .where(eq(mensaje.conversacionId, conversacionId))
    .orderBy(asc(mensaje.fecha), asc(mensaje.id));
}

/**
 * Suma una consulta de IA al día de hoy (en UTC) del usuario, solo si aún no ha llegado al límite.
 * Es UNA sentencia (insert … on conflict … where), así que dos peticiones a la vez no pueden pasarse del límite.
 * Devuelve el total del día tras sumar, o null si ya estaba en el límite (y entonces no suma nada).
 */
export async function sumarUsoIa(usuarioId: string, limite: number, db: Db = getDb()): Promise<number | null> {
  const [fila] = await db
    .insert(usoIa)
    .values({ usuarioId, dia: sql`(now() at time zone 'utc')::date`, total: 1 })
    .onConflictDoUpdate({
      target: [usoIa.usuarioId, usoIa.dia],
      set: { total: sql.raw(`"uso_ia"."total" + 1`) },
      setWhere: sql`"uso_ia"."total" < ${limite}`,
    })
    .returning({ total: usoIa.total });
  return fila?.total ?? null;
}

// ─── Tutor humano (H9) ───────────────────────────────────────────────────────

/** Pregunta guardada con su dueño, o null. Para comprobar que es del alumno antes de pasarla. */
export async function leerPregunta(preguntaId: string, db: Db = getDb()) {
  const [fila] = await db
    .select({ id: mensaje.id, rol: mensaje.rol, usuarioId: conversacion.usuarioId })
    .from(mensaje)
    .innerJoin(conversacion, eq(conversacion.id, mensaje.conversacionId))
    .where(eq(mensaje.id, preguntaId))
    .limit(1);
  return fila ?? null;
}

/** Marca la pregunta como pasada a un tutor humano. Si ya lo estaba, no hace nada (una pregunta, una duda). */
export async function crearDudaHumana(preguntaId: string, db: Db = getDb()): Promise<void> {
  await db.insert(dudaHumana).values({ mensajeId: preguntaId }).onConflictDoNothing({ target: dudaHumana.mensajeId });
}

/** Dudas pasadas a un tutor humano, con su pregunta, su alumno, su módulo y su curso. */
export async function leerDudasHumanas(
  filtro: { id?: string; preguntaId?: string; usuarioId?: string; moduloSlug?: string; cursoSlug?: string },
  db: Db = getDb(),
) {
  const condiciones: SQL[] = [];
  if (filtro.id) condiciones.push(eq(dudaHumana.id, filtro.id));
  if (filtro.preguntaId) condiciones.push(eq(dudaHumana.mensajeId, filtro.preguntaId));
  if (filtro.usuarioId) condiciones.push(eq(conversacion.usuarioId, filtro.usuarioId));
  if (filtro.moduloSlug) condiciones.push(eq(modulo.slug, filtro.moduloSlug));
  if (filtro.cursoSlug) condiciones.push(eq(curso.slug, filtro.cursoSlug));
  return db
    .select({
      id: dudaHumana.id,
      preguntaId: mensaje.id,
      pregunta: mensaje.texto,
      creada: dudaHumana.creada,
      respuesta: dudaHumana.respuesta,
      respondida: dudaHumana.respondida,
      moduloSlug: modulo.slug,
      moduloTitulo: modulo.titulo,
      cursoSlug: curso.slug,
      alumno: usuario.nombre,
    })
    .from(dudaHumana)
    .innerJoin(mensaje, eq(mensaje.id, dudaHumana.mensajeId))
    .innerJoin(conversacion, eq(conversacion.id, mensaje.conversacionId))
    .innerJoin(usuario, eq(usuario.id, conversacion.usuarioId))
    .innerJoin(modulo, eq(modulo.id, conversacion.moduloId))
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .where(and(...condiciones))
    .orderBy(asc(dudaHumana.creada));
}

/** Guarda la respuesta del profesor solo si aún no estaba respondida. Devuelve false si ya lo estaba. */
export async function guardarRespuestaHumana(id: string, profesorId: string, respuesta: string, db: Db = getDb()): Promise<boolean> {
  const filas = await db
    .update(dudaHumana)
    .set({ respuesta, respondidaPor: profesorId, respondida: sql`now()` })
    .where(and(eq(dudaHumana.id, id), isNull(dudaHumana.respuesta)))
    .returning({ id: dudaHumana.id });
  return filas.length > 0;
}
