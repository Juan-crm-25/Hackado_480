/**
 * Reglas del test del módulo (#3), sin BBDD ni IA: qué preguntas salen, la nota y cómo queda el módulo.
 * El test coge preguntas del banco del módulo (ejercicios aprobados con `uso = modulo`).
 */
import type { EstadoModulo } from "./types";

export const PREGUNTAS_MINIMAS = 5;
export const PREGUNTAS_MAXIMAS = 8;
/** Nota sobre 10 para aprobar el test y completar el módulo. */
export const NOTA_APROBADO = 7;

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Elige al azar entre PREGUNTAS_MINIMAS y PREGUNTAS_MAXIMAS preguntas del banco: primero una de cada concepto (para
 * que el test recorra todo el módulo) y luego otras al azar hasta PREGUNTAS_MAXIMAS, en orden aleatorio. Si el banco
 * tiene menos de PREGUNTAS_MINIMAS, devuelve una lista vacía (el módulo aún no tiene test).
 */
export function elegirPreguntas<T extends { id: string; conceptoId: string }>(banco: T[], azar: () => number = Math.random): T[] {
  if (banco.length < PREGUNTAS_MINIMAS) return [];
  const barajadas = barajar(banco, azar);
  const unaPorConcepto = barajadas.filter((e, i) => barajadas.findIndex((x) => x.conceptoId === e.conceptoId) === i);
  const resto = barajadas.filter((e) => !unaPorConcepto.includes(e));
  return barajar([...unaPorConcepto, ...resto].slice(0, PREGUNTAS_MAXIMAS), azar);
}

function barajar<T>(lista: T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Nota sobre 10: la media de las puntuaciones (cada una de 0 a 1), con dos decimales. */
export function calcularNota(puntuaciones: number[]): number {
  if (puntuaciones.length === 0) return 0;
  return redondear((puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length) * 10);
}

/**
 * Estado del módulo después de un test. Aprobado: completado. Suspendido: nunca baja (cuenta el mejor intento,
 * y un módulo «dominado» por el diagnóstico lo sigue estando); si no había empezado, pasa a «en curso».
 */
export function estadoTrasTest(antes: EstadoModulo | null, aprobado: boolean): EstadoModulo {
  if (aprobado) return "completado";
  if (antes === "completado" || antes === "dominado" || antes === "en_curso") return antes;
  return "en_curso";
}

/** Aciertos de cada concepto en un intento: la media de sus puntuaciones, de 0 a 1 y con dos decimales. */
export function aciertosPorConcepto(resultados: { conceptoId: string; puntuacion: number }[]): Record<string, number> {
  const suma = new Map<string, { total: number; n: number }>();
  for (const { conceptoId, puntuacion } of resultados) {
    const actual = suma.get(conceptoId) ?? { total: 0, n: 0 };
    suma.set(conceptoId, { total: actual.total + puntuacion, n: actual.n + 1 });
  }
  return Object.fromEntries([...suma].map(([c, { total, n }]) => [c, redondear(total / n)]));
}
