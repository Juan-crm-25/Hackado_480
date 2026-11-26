import "server-only";
import { and, asc, count, desc, eq, lt, ne, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/lib/db/client";
import { comentarioForo, curso, modulo, puntoForo, temaForo, usuario } from "@/lib/db/schema";
import { EMAIL_IA_FORO } from "@/lib/db/seed/datos";
import type { MotivoPuntos, ValidacionForo, ValoracionRespuesta } from "@/lib/foro";

/** Datos del autor que necesita el servicio. El email solo sirve para reconocer a Sensei: nunca sale de aquí hacia la API. */
const columnasAutor = {
  autorId: usuario.id,
  autorNombre: usuario.nombre,
  autorImagenUrl: usuario.imagenUrl,
  autorRol: usuario.rol,
  autorEmail: usuario.email,
};
export type FilaAutor = { autorId: string; autorNombre: string; autorImagenUrl: string | null; autorRol: string; autorEmail: string };

export async function leerModuloDelCurso(cursoId: string, moduloSlug: string, db: Db) {
  const [fila] = await db
    .select({ id: modulo.id, slug: modulo.slug, titulo: modulo.titulo })
    .from(modulo)
    .where(and(eq(modulo.cursoId, cursoId), eq(modulo.slug, moduloSlug)))
    .limit(1);
  return fila ?? null;
}

export async function leerTemasDelModulo(moduloId: string, db: Db) {
  const comentarios = db
    .select({ temaId: comentarioForo.temaId, total: count().as("total") })
    .from(comentarioForo)
    .groupBy(comentarioForo.temaId)
    .as("comentarios");
  return db
    .select({
      id: temaForo.id,
      titulo: temaForo.titulo,
      cuerpo: temaForo.cuerpo,
      creado: temaForo.creado,
      ...columnasAutor,
      comentarios: comentarios.total,
      puntos: puntoForo.puntos,
      motivo: puntoForo.motivo,
    })
    .from(temaForo)
    .innerJoin(usuario, eq(usuario.id, temaForo.autorId))
    .leftJoin(comentarios, eq(comentarios.temaId, temaForo.id))
    .leftJoin(puntoForo, eq(puntoForo.temaId, temaForo.id))
    .where(eq(temaForo.moduloId, moduloId))
    .orderBy(desc(temaForo.creado), desc(temaForo.id));
}

export async function insertarTema(datos: { moduloId: string; autorId: string; titulo: string; cuerpo: string }, db: Db) {
  const [fila] = await db.insert(temaForo).values(datos).returning();
  return fila;
}

/** Un tema con su autor, su curso y sus puntos del profesor, o null. */
export async function leerTema(temaId: string, db: Db) {
  const [fila] = await db
    .select({
      id: temaForo.id,
      titulo: temaForo.titulo,
      cuerpo: temaForo.cuerpo,
      creado: temaForo.creado,
      ...columnasAutor,
      cursoSlug: curso.slug,
      moduloSlug: modulo.slug,
      moduloTitulo: modulo.titulo,
      puntos: puntoForo.puntos,
      motivo: puntoForo.motivo,
    })
    .from(temaForo)
    .innerJoin(usuario, eq(usuario.id, temaForo.autorId))
    .innerJoin(modulo, eq(modulo.id, temaForo.moduloId))
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .leftJoin(puntoForo, eq(puntoForo.temaId, temaForo.id))
    .where(eq(temaForo.id, temaId))
    .limit(1);
  return fila ?? null;
}

const columnasComentario = {
  id: comentarioForo.id,
  temaId: comentarioForo.temaId,
  respuestaAId: comentarioForo.respuestaAId,
  cuerpo: comentarioForo.cuerpo,
  validacion: comentarioForo.validacion,
  validadoPor: comentarioForo.validadoPor,
  creado: comentarioForo.creado,
  ...columnasAutor,
  puntos: puntoForo.puntos,
  motivo: puntoForo.motivo,
};

/** Comentarios del tema, del más antiguo al más nuevo, con su autor y sus puntos del profesor. */
export async function leerComentariosDelTema(temaId: string, db: Db) {
  return db
    .select(columnasComentario)
    .from(comentarioForo)
    .innerJoin(usuario, eq(usuario.id, comentarioForo.autorId))
    .leftJoin(puntoForo, eq(puntoForo.comentarioId, comentarioForo.id))
    .where(eq(comentarioForo.temaId, temaId))
    .orderBy(asc(comentarioForo.creado), asc(comentarioForo.id));
}
export type FilaComentario = Awaited<ReturnType<typeof leerComentariosDelTema>>[number];

export async function leerComentarioDelTema(comentarioId: string, db: Db) {
  const [fila] = await db
    .select(columnasComentario)
    .from(comentarioForo)
    .innerJoin(usuario, eq(usuario.id, comentarioForo.autorId))
    .leftJoin(puntoForo, eq(puntoForo.comentarioId, comentarioForo.id))
    .where(eq(comentarioForo.id, comentarioId))
    .limit(1);
  return fila ?? null;
}

const autorTema = alias(usuario, "autor_tema");

/** Lo que hace falta para valorar un comentario: el comentario, su autor, el tema (la duda) y el autor del tema. */
export async function leerComentarioParaValorar(comentarioId: string, db: Db) {
  const [fila] = await db
    .select({
      id: comentarioForo.id,
      temaId: comentarioForo.temaId,
      cuerpo: comentarioForo.cuerpo,
      validacion: comentarioForo.validacion,
      ...columnasAutor,
      temaTitulo: temaForo.titulo,
      temaCuerpo: temaForo.cuerpo,
      temaAutorId: temaForo.autorId,
      temaAutorNombre: autorTema.nombre,
      cursoSlug: curso.slug,
    })
    .from(comentarioForo)
    .innerJoin(usuario, eq(usuario.id, comentarioForo.autorId))
    .innerJoin(temaForo, eq(temaForo.id, comentarioForo.temaId))
    .innerJoin(autorTema, eq(autorTema.id, temaForo.autorId))
    .innerJoin(modulo, eq(modulo.id, temaForo.moduloId))
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .where(eq(comentarioForo.id, comentarioId))
    .limit(1);
  return fila ?? null;
}

export async function insertarComentario(datos: { temaId: string; autorId: string; cuerpo: string; respuestaAId?: string }, db: Db) {
  const [fila] = await db.insert(comentarioForo).values(datos).returning({ id: comentarioForo.id });
  return fila.id;
}

const sigueSiendoPendiente = (comentarioId: string) => and(eq(comentarioForo.id, comentarioId), eq(comentarioForo.validacion, "pendiente"));

/** Guarda la decisión de la IA SOLO si sigue pendiente (nunca pisa al profesor). ¿Ha cambiado la fila? */
export async function guardarValoracionIa(comentarioId: string, validacion: ValidacionForo, fecha: Date, db: Db): Promise<boolean> {
  const filas = await db
    .update(comentarioForo)
    .set({ validacion, validadoPor: "ia", validadoEn: fecha })
    .where(sigueSiendoPendiente(comentarioId))
    .returning({ id: comentarioForo.id });
  return filas.length > 0;
}

/**
 * Guarda la valoración de la IA (solo si sigue pendiente) y, si se guardó, la respuesta de Sensei en el mismo hilo,
 * en una transacción: nunca queda una valoración sin su respuesta ni una respuesta sin valoración.
 */
export async function guardarValoracionYRespuesta(
  datos: { comentarioId: string; temaId: string; valoracion: ValoracionRespuesta; frase: string; fecha: Date },
  db: Db,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const filas = await tx
      .update(comentarioForo)
      .set({ validacion: datos.valoracion, validadoPor: "ia", validadoEn: datos.fecha })
      .where(sigueSiendoPendiente(datos.comentarioId))
      .returning({ id: comentarioForo.id });
    if (filas.length === 0) return false;
    const [sensei] = await tx.select({ id: usuario.id }).from(usuario).where(eq(usuario.email, EMAIL_IA_FORO)).limit(1);
    if (!sensei) throw new Error("[foro] Falta el usuario Sensei (npm run db:seed)");
    await tx.insert(comentarioForo).values({ temaId: datos.temaId, autorId: sensei.id, respuestaAId: datos.comentarioId, cuerpo: datos.frase });
    return true;
  });
}

/** El profesor decide: siempre prevalece, aunque la IA ya lo hubiera valorado. */
export async function guardarValidacionProfesor(comentarioId: string, validacion: ValidacionForo, profesorId: string, fecha: Date, db: Db) {
  await db
    .update(comentarioForo)
    .set({ validacion, validadoPor: "profesor", profesorId, validadoEn: fecha })
    .where(eq(comentarioForo.id, comentarioId));
}

/**
 * Comentarios pendientes del tema creados antes de `antesDe` que la IA puede valorar, los más antiguos primero.
 * Se dejan fuera los que nunca se valoran (Sensei, profesores, admins y el autor de la duda) para que no ocupen hueco.
 */
export async function leerPendientesParaReintento(temaId: string, temaAutorId: string, antesDe: Date, limite: number, db: Db) {
  const filas = await db
    .select({ id: comentarioForo.id })
    .from(comentarioForo)
    .innerJoin(usuario, eq(usuario.id, comentarioForo.autorId))
    .where(
      and(
        eq(comentarioForo.temaId, temaId),
        eq(comentarioForo.validacion, "pendiente"),
        lt(comentarioForo.creado, antesDe),
        notInArray(usuario.rol, ["profesor", "admin"]),
        ne(usuario.email, EMAIL_IA_FORO),
        ne(comentarioForo.autorId, temaAutorId),
      ),
    )
    .orderBy(asc(comentarioForo.creado), asc(comentarioForo.id))
    .limit(limite);
  return filas.map((f) => f.id);
}

export type DestinoPunto = { temaId: string } | { comentarioId: string };

/** Da o cambia los puntos del profesor a un tema o comentario: uno por destino (sustituye, no acumula). */
export async function guardarPuntos(
  datos: DestinoPunto & { profesorId: string; alumnoId: string; puntos: number; motivo: MotivoPuntos },
  db: Db,
) {
  const objetivo = "temaId" in datos ? puntoForo.temaId : puntoForo.comentarioId;
  await db
    .insert(puntoForo)
    .values(datos)
    .onConflictDoUpdate({
      target: objetivo,
      set: { profesorId: datos.profesorId, alumnoId: datos.alumnoId, puntos: datos.puntos, motivo: datos.motivo, creado: new Date() },
    });
}

export async function borrarPuntos(destino: DestinoPunto, db: Db) {
  await db.delete(puntoForo).where("temaId" in destino ? eq(puntoForo.temaId, destino.temaId) : eq(puntoForo.comentarioId, destino.comentarioId));
}

