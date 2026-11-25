import type { EstadoModulo, Progreso } from "./types";

const ETIQUETAS: Record<EstadoModulo, string> = {
  pendiente: "Sin empezar",
  en_curso: "En curso",
  dominado: "Dominado",
  completado: "Completado",
};

/** Estado del módulo según el progreso del alumno. Sin progreso, el módulo está pendiente. */
export function estadoDeModulo(moduloId: string, progreso: Progreso[]): EstadoModulo {
  return progreso.find((p) => p.moduloId === moduloId)?.estado ?? "pendiente";
}

/** El estado en texto: en la interfaz nunca se transmite solo con color. */
export function etiquetaEstado(estado: EstadoModulo): string {
  return ETIQUETAS[estado];
}

/**
 * Módulo para «Sigue donde lo dejaste»: el módulo en curso tocado más recientemente; si no hay
 * ninguno, el primero sin terminar de la ruta sugerida (`modulos` ya viene ordenado). Sirve para
 * cualquier módulo con `id` (el del contrato o el leído de la BBDD).
 */
export function moduloParaSeguir<M extends { id: string }>(modulos: M[], progreso: Progreso[]): M | undefined {
  const enCurso = progreso
    .filter((p) => p.estado === "en_curso")
    .sort((a, b) => b.actualizado.localeCompare(a.actualizado))
    .map((p) => modulos.find((m) => m.id === p.moduloId))
    .find((m) => m !== undefined);
  if (enCurso) return enCurso;
  return modulos.find((m) => estadoDeModulo(m.id, progreso) === "pendiente");
}
