import "server-only";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { conversacion, mensaje, usoIa, usuario } from "@/lib/db/schema";
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
