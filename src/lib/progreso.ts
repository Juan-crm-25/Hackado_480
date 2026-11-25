/** Estados de `progreso` que cuentan como módulo terminado. */
export const ESTADOS_COMPLETADOS = ["dominado", "completado"] as const;

/** Porcentaje (0-100, entero) de módulos completados de un curso. Sin módulos, 0. */
export function porcentajeCompletado(completados: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completados / total) * 100)));
}
