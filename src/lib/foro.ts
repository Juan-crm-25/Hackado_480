/**
 * Reglas del foro (H10) que comparten la API y las pantallas: puntos por valoración, frases de Sensei
 * y puntos que puede dar el profesor. Sin dependencias de servidor.
 */

export type ValoracionRespuesta = "correcta" | "aproximada" | "incorrecta";
export type ValidacionForo = "pendiente" | ValoracionRespuesta | "no_respuesta";

/** Puntos de una respuesta según su valoración (no se guardan: se calculan). */
export const PUNTOS_POR_VALIDACION: Record<ValidacionForo, number> = {
  pendiente: 0,
  correcta: 10,
  aproximada: 5,
  incorrecta: 0,
  no_respuesta: 0,
};

/** Lo que contesta Sensei en el hilo. Las escribe el código: la IA solo decide la valoración. */
export const FRASES_SENSEI: Record<ValoracionRespuesta, string> = {
  correcta: "¡Genial, tú sí que sabes del tema!",
  aproximada: "¡Me gusta cómo piensas, pero se puede afinar más!",
  incorrecta: "Esta respuesta no es correcta, ¡sigue investigando!",
};

/** Puntos que puede dar el profesor del curso y por qué. */
export const PUNTOS_PROFESOR = [1, 3, 6] as const;
export type PuntosProfesor = (typeof PUNTOS_PROFESOR)[number];
export const MOTIVOS_PUNTOS = [
  { id: "buena_pregunta", texto: "Buena pregunta" },
  { id: "buena_conducta", texto: "Buena conducta" },
] as const;
export type MotivoPuntos = (typeof MOTIVOS_PUNTOS)[number]["id"];
