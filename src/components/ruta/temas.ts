/**
 * Color de identidad de cada módulo según su posición: solo decorativo (docs/estilo.md, «Color con intención»).
 * Las clases van completas para que Tailwind las detecte. Texto carbón sobre el color: buen contraste en los cuatro.
 */
export const TEMAS_MODULO = [
  { franja: "bg-chart-1", suave: "bg-chart-1/15", circulo: "bg-chart-1 text-surface-dark" },
  { franja: "bg-chart-2", suave: "bg-chart-2/15", circulo: "bg-chart-2 text-surface-dark" },
  { franja: "bg-chart-3", suave: "bg-chart-3/15", circulo: "bg-chart-3 text-surface-dark" },
  { franja: "bg-chart-4", suave: "bg-chart-4/15", circulo: "bg-chart-4 text-surface-dark" },
] as const;

export const temaDe = (indice: number) => TEMAS_MODULO[indice % TEMAS_MODULO.length];
