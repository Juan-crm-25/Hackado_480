/**
 * Tiempo de reproducción real de un vídeo, para marcarlo «visto» solo tras 15 s viéndolo (S20).
 * Se cuenta tiempo de reloj entre avisos mientras el reproductor dice que está reproduciendo; cada paso
 * vale como mucho 2 s, así una pestaña dormida o un cambio de reloj no suman de golpe (y saltar con la
 * barra del vídeo no cuenta, porque no pasa tiempo de reloj).
 */

export const SEGUNDOS_PARA_VISTO = 15;
const MAX_PASO_MS = 2000;

export type EstadoReproduccion = {
  /** Segundos reproducidos acumulados. */
  segundos: number;
  reproduciendo: boolean;
  /** Momento (ms) del último aviso mientras se reproducía; null si no se está reproduciendo. */
  ultimoMs: number | null;
};

export type EventoReproduccion = { tipo: "estado"; reproduciendo: boolean } | { tipo: "tick" };

export const REPRODUCCION_INICIAL: EstadoReproduccion = { segundos: 0, reproduciendo: false, ultimoMs: null };

export function acumularReproduccion(
  estado: EstadoReproduccion,
  evento: EventoReproduccion,
  ahoraMs: number,
): EstadoReproduccion {
  const paso =
    estado.reproduciendo && estado.ultimoMs !== null
      ? Math.min(Math.max(ahoraMs - estado.ultimoMs, 0), MAX_PASO_MS) / 1000
      : 0;
  const segundos = estado.segundos + paso;
  const reproduciendo = evento.tipo === "estado" ? evento.reproduciendo : estado.reproduciendo;
  return { segundos, reproduciendo, ultimoMs: reproduciendo ? ahoraMs : null };
}

export function alcanzaVisto(estado: EstadoReproduccion): boolean {
  return estado.segundos >= SEGUNDOS_PARA_VISTO;
}

function segundosEnteros(segundos: number): number {
  return Math.min(Math.floor(segundos), SEGUNDOS_PARA_VISTO);
}

/** «Viendo… 9 s de 15». */
export function textoContador(segundos: number): string {
  return `Viendo… ${segundosEnteros(segundos)} s de ${SEGUNDOS_PARA_VISTO}`;
}

/** «En pausa: 6 s de 15». */
export function textoPausa(segundos: number): string {
  return `En pausa: ${segundosEnteros(segundos)} s de ${SEGUNDOS_PARA_VISTO}`;
}

/** Abre o cierra una fila del acordeón. Abrirla no la marca como vista. */
export function alternarAbierta(abiertas: ReadonlySet<string>, claseId: string): Set<string> {
  const nuevas = new Set(abiertas);
  if (nuevas.has(claseId)) nuevas.delete(claseId);
  else nuevas.add(claseId);
  return nuevas;
}
