/**
 * Pasos del asistente «Personaliza tu ruta» (carrusel): un módulo cada vez; al contestar se pasa al siguiente
 * y la barra se llena. Funciones puras para poder probarlas sin navegador.
 */
import type { Valoracion } from "./ruta";

export type EstadoAsistente = {
  /** Módulo que se está mostrando; igual al total cuando ya ha contestado todos. */
  indice: number;
  valoraciones: Record<string, Valoracion>;
};

export const ASISTENTE_INICIAL: EstadoAsistente = { indice: 0, valoraciones: {} };

/** Guarda la respuesta del módulo y pasa al siguiente (sin pasar del final). */
export function elegir(estado: EstadoAsistente, moduloId: string, valoracion: Valoracion, total: number): EstadoAsistente {
  return {
    indice: Math.min(estado.indice + 1, total),
    valoraciones: { ...estado.valoraciones, [moduloId]: valoracion },
  };
}

/** Vuelve al módulo anterior conservando las respuestas. */
export function volver(estado: EstadoAsistente): EstadoAsistente {
  return { ...estado, indice: Math.max(estado.indice - 1, 0) };
}

export function estaTerminado(estado: EstadoAsistente, total: number): boolean {
  return estado.indice >= total;
}

/** Porcentaje de la barra: módulos contestados sobre el total. */
export function avanceAsistente(estado: EstadoAsistente, total: number): number {
  if (total <= 0) return 100;
  return Math.round((Math.min(Object.keys(estado.valoraciones).length, total) / total) * 100);
}
