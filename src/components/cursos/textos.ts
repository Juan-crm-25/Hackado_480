/** Textos y clases de las pantallas de cursos (funciones puras, sin dependencias de servidor). */

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

export const textoEstudiantes = (n: number) => plural(n, "estudiante", "estudiantes");
export const textoValoraciones = (n: number) => plural(n, "valoración", "valoraciones");
export const textoModulos = (n: number) => plural(n, "módulo", "módulos");

// Color de identidad de cada categoría: solo decorativo (docs/estilo.md, «Color con intención»).
const FRANJAS: Record<string, string> = {
  programacion: "bg-chart-1",
  ia: "bg-chart-2",
  cocina: "bg-chart-3",
  costura: "bg-chart-4",
  oposiciones: "bg-chart-5",
};

export function franjaDeCategoria(slug: string): string {
  return FRANJAS[slug] ?? "bg-chart-2";
}

/** Ancho de una barra de reparto: porcentaje entero de `parte` sobre `total` (0 si no hay total). */
export function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}
