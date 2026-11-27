/**
 * Reglas de la barra de premios del perfil, sin React: dónde va cada hito, cuánto se rellena y el estado de cada premio.
 * El saldo y los canjes vienen de la BBDD (src/server/recompensas): aquí solo se decide cómo se pintan.
 */

/** Posición (0-100 %) del hito i de n: en el centro de su columna, para alinearse con la tarjeta del premio. */
export function posicionHito(i: number, n: number): number {
  return ((2 * i + 1) / (2 * n)) * 100;
}

/**
 * Relleno de la barra (0-100 %) para `total` puntos. Los hitos van repartidos por igual (no a escala: 100, 340 y 460
 * quedarían amontonados), así que el relleno avanza por tramos: de 0 al primer hito y de cada hito al siguiente.
 * Pasado el último hito, la barra se llena entera.
 */
export function rellenoBarra(total: number, hitos: readonly number[]): number {
  const puntos = Number.isFinite(total) && total > 0 ? total : 0;
  const n = hitos.length;
  if (n === 0 || puntos > hitos[n - 1]) return n === 0 ? 0 : 100;
  let desde = 0;
  let posDesde = 0;
  for (let i = 0; i < n; i++) {
    const hasta = hitos[i];
    const posHasta = posicionHito(i, n);
    if (puntos <= hasta) return posDesde + ((puntos - desde) / (hasta - desde)) * (posHasta - posDesde);
    desde = hasta;
    posDesde = posHasta;
  }
  return 100;
}

export type EstadoPremio = { tipo: "canjeado" } | { tipo: "disponible" } | { tipo: "bloqueado"; faltan: number };

export function estadoPremio(total: number, premio: { id: string; puntos: number }, canjeados: ReadonlySet<string>): EstadoPremio {
  if (canjeados.has(premio.id)) return { tipo: "canjeado" };
  if (total >= premio.puntos) return { tipo: "disponible" };
  return { tipo: "bloqueado", faltan: premio.puntos - Math.max(0, total) };
}
