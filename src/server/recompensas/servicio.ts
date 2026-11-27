import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import { calcularPuntosRespuestas } from "@/lib/foro";
import { PREMIOS } from "@/lib/demo/premios";
import { conflicto, noEncontrado } from "../compartido/errores";
import { insertarPuntosDemo, leerComentariosDeTemasConPuntos, leerMovimientos, registrarCanje, sumarPuntosDelProfesor } from "./repositorio";

export interface PuntosDelAlumno {
  total: number;
  /**
   * Por sus respuestas valoradas en el foro (correcta +10, aproximada +5), con la misma regla anti-spam que el hilo (S12):
   * una vez por tema y solo las 3 primeras correctas de personas distintas. Se calculan, no se guardan.
   */
  respuestas: number;
  /** Los que le ha dado el profesor (+1, +3 o +6 por buena pregunta o buena conducta). */
  profesor: number;
}

/** Puntos del foro de un usuario, para su perfil y GET /api/yo/puntos. */
export async function obtenerPuntosDelAlumno(usuarioId: string, db: Db = getDb()): Promise<PuntosDelAlumno> {
  const [comentarios, profesor] = await Promise.all([leerComentariosDeTemasConPuntos(usuarioId, db), sumarPuntosDelProfesor(usuarioId, db)]);
  const porTema = Map.groupBy(comentarios, (c) => c.temaId);
  let respuestas = 0;
  for (const delTema of porTema.values()) {
    const puntos = calcularPuntosRespuestas(delTema);
    for (const c of delTema) if (c.autorId === usuarioId) respuestas += puntos.get(c.id) ?? 0;
  }
  return { total: respuestas + profesor, respuestas, profesor };
}

/** Cantidades que suman los botones de demo del perfil («+100 puntos» y «+1000 puntos»). */
export const PUNTOS_DEMO = [100, 1000] as const;
export type PuntosDemo = (typeof PUNTOS_DEMO)[number];

export interface SaldoPremios {
  /** Puntos ganados en el foro: por respuestas más los del profesor. */
  foro: number;
  /** Por sus respuestas valoradas en el foro (correcta +10, aproximada +5). */
  respuestas: number;
  /** Los que le ha dado el profesor (+1, +3 o +6). */
  profesor: number;
  /** Puntos de demo sumados. */
  demo: number;
  /** Puntos gastados en canjes. */
  canjeado: number;
  /** Lo que puede gastar: foro + demo − canjeado. */
  saldo: number;
  /** Premios ya canjeados. */
  canjeados: string[];
}

/** Saldo de puntos del perfil (premios): los del foro más los movimientos guardados (canjes y demo). */
export async function obtenerSaldoPremios(usuarioId: string, db: Db = getDb()): Promise<SaldoPremios> {
  const [{ total: foro, respuestas, profesor }, movimientos] = await Promise.all([
    obtenerPuntosDelAlumno(usuarioId, db),
    leerMovimientos(usuarioId, db),
  ]);
  return { foro, respuestas, profesor, ...movimientos, saldo: foro + movimientos.demo - movimientos.canjeado };
}

/** Suma puntos de demo del MVP (100 o 1000, para poder enseñar el canje) y devuelve el saldo nuevo. */
export async function sumarPuntosDemo(usuarioId: string, puntos: PuntosDemo, db: Db = getDb()): Promise<SaldoPremios> {
  await insertarPuntosDemo(usuarioId, puntos, db);
  return obtenerSaldoPremios(usuarioId, db);
}

/**
 * Canjea un premio: resta sus puntos del saldo. Es una SIMULACIÓN del MVP (no se entrega nada).
 * 404 si el premio no existe; 409 si ya lo ha canjeado o no le llega el saldo.
 */
export async function canjearPremio(usuarioId: string, premioId: string, db: Db = getDb()): Promise<SaldoPremios> {
  const premio = PREMIOS.find((p) => p.id === premioId);
  if (!premio) throw noEncontrado("Ese premio no existe");
  const { total: foro } = await obtenerPuntosDelAlumno(usuarioId, db);
  const resultado = await registrarCanje(usuarioId, premio, foro, db);
  if (resultado === "repetido") throw conflicto("Ya has canjeado este premio");
  if (resultado === "sin_saldo") throw conflicto("No tienes puntos suficientes para este premio");
  return obtenerSaldoPremios(usuarioId, db);
}
