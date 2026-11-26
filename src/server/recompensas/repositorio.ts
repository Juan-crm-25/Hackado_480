import "server-only";
import { count, eq, sum } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { comentarioForo, puntoForo } from "@/lib/db/schema";

/** Cuántos comentarios del usuario hay con cada validación. */
export async function contarComentariosPorValidacion(usuarioId: string, db: Db) {
  return db
    .select({ validacion: comentarioForo.validacion, total: count() })
    .from(comentarioForo)
    .where(eq(comentarioForo.autorId, usuarioId))
    .groupBy(comentarioForo.validacion);
}

/** Suma de los puntos que le han dado los profesores en el foro. */
export async function sumarPuntosDelProfesor(alumnoId: string, db: Db): Promise<number> {
  const [fila] = await db.select({ total: sum(puntoForo.puntos) }).from(puntoForo).where(eq(puntoForo.alumnoId, alumnoId));
  return Number(fila?.total ?? 0);
}
