import "server-only";
import { and, asc, eq, inArray, ne, notInArray, sum } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { comentarioForo, puntoForo, usuario } from "@/lib/db/schema";
import { EMAIL_IA_FORO } from "@/lib/db/seed/datos";

/**
 * Comentarios de alumnos (sin Sensei ni profesores/admins) de los temas donde el usuario tiene alguna respuesta
 * correcta o aproximada: los únicos temas en los que puede ganar puntos. Por tema y en orden de creación.
 */
export async function leerComentariosDeTemasConPuntos(usuarioId: string, db: Db) {
  const temasConPuntos = db
    .selectDistinct({ temaId: comentarioForo.temaId })
    .from(comentarioForo)
    .where(and(eq(comentarioForo.autorId, usuarioId), inArray(comentarioForo.validacion, ["correcta", "aproximada"])));
  return db
    .select({
      id: comentarioForo.id,
      temaId: comentarioForo.temaId,
      autorId: comentarioForo.autorId,
      validacion: comentarioForo.validacion,
      creado: comentarioForo.creado,
    })
    .from(comentarioForo)
    .innerJoin(usuario, eq(usuario.id, comentarioForo.autorId))
    .where(
      and(
        inArray(comentarioForo.temaId, temasConPuntos),
        notInArray(usuario.rol, ["profesor", "admin"]),
        ne(usuario.email, EMAIL_IA_FORO),
      ),
    )
    .orderBy(asc(comentarioForo.temaId), asc(comentarioForo.creado), asc(comentarioForo.id));
}

/** Suma de los puntos que le han dado los profesores en el foro. */
export async function sumarPuntosDelProfesor(alumnoId: string, db: Db): Promise<number> {
  const [fila] = await db.select({ total: sum(puntoForo.puntos) }).from(puntoForo).where(eq(puntoForo.alumnoId, alumnoId));
  return Number(fila?.total ?? 0);
}
