import "server-only";
import { sql } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { usoIa } from "@/lib/db/schema";

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
