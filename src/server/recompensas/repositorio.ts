import "server-only";
import { and, asc, eq, inArray, ne, notInArray, sum } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { comentarioForo, movimientoPuntos, puntoForo, usuario } from "@/lib/db/schema";
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

export interface Movimientos {
  /** Puntos de demo sumados (positivo). */
  demo: number;
  /** Puntos gastados en canjes (positivo). */
  canjeado: number;
  /** Ids de los premios canjeados, en orden de canje. */
  canjeados: string[];
}

/** Movimientos del saldo del usuario: lo sumado en demo, lo gastado en canjes y qué premios ha canjeado. */
export async function leerMovimientos(usuarioId: string, db: Pick<Db, "select">): Promise<Movimientos> {
  const filas = await db
    .select({ tipo: movimientoPuntos.tipo, premio: movimientoPuntos.premio, puntos: movimientoPuntos.puntos })
    .from(movimientoPuntos)
    .where(eq(movimientoPuntos.usuarioId, usuarioId))
    .orderBy(asc(movimientoPuntos.creado));
  let demo = 0;
  let canjeado = 0;
  const canjeados: string[] = [];
  for (const f of filas) {
    if (f.tipo === "demo") demo += f.puntos;
    else {
      canjeado -= f.puntos;
      if (f.premio) canjeados.push(f.premio);
    }
  }
  return { demo, canjeado, canjeados };
}

export async function insertarPuntosDemo(usuarioId: string, puntos: number, db: Db): Promise<void> {
  await db.insert(movimientoPuntos).values({ usuarioId, tipo: "demo", puntos });
}

export type ResultadoCanje = "canjeado" | "repetido" | "sin_saldo";

/**
 * Canjea un premio si el saldo llega: en una transacción que bloquea la fila del usuario (FOR UPDATE), así dos canjes
 * a la vez se ponen en cola y no gastan el mismo saldo. `puntosForo` se calcula fuera: solo puede subir mientras tanto.
 */
export async function registrarCanje(
  usuarioId: string,
  premio: { id: string; puntos: number },
  puntosForo: number,
  db: Db,
): Promise<ResultadoCanje> {
  return db.transaction(async (tx) => {
    await tx.select({ id: usuario.id }).from(usuario).where(eq(usuario.id, usuarioId)).for("update");
    const { demo, canjeado, canjeados } = await leerMovimientos(usuarioId, tx);
    if (canjeados.includes(premio.id)) return "repetido";
    if (puntosForo + demo - canjeado < premio.puntos) return "sin_saldo";
    await tx.insert(movimientoPuntos).values({ usuarioId, tipo: "canje", premio: premio.id, puntos: -premio.puntos });
    return "canjeado";
  });
}
