/**
 * Estados de `progreso` que cuentan como módulo terminado: solo «completado», que se consigue aprobando el test del
 * módulo (#3). «Dominado» lo pone el diagnóstico y solo cambia el orden de la ruta: aún falta el test (SPEC, H6).
 */
export const ESTADOS_COMPLETADOS = ["completado"] as const;

/** Porcentaje (0-100, entero) de módulos completados de un curso. Sin módulos, 0. */
export function porcentajeCompletado(completados: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completados / total) * 100)));
}
