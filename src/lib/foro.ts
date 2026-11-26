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

/** Lo mínimo de un comentario de alumno para calcular sus puntos. */
export interface ComentarioPuntuable {
  id: string;
  autorId: string;
  validacion: ValidacionForo;
  /** Fecha de creación (Date o ISO). */
  creado: Date | string;
}

/** Cuántas respuestas correctas (de personas distintas) dan puntos en un tema. */
export const MAX_CORRECTAS_CON_PUNTOS = 3;

/**
 * Puntos de cada respuesta de un tema (S12, regla anti-spam). Recibe SOLO los comentarios de alumnos de UN tema
 * (sin Sensei ni profesores/admins) y los recorre por orden de creación (si empatan, por id):
 * - cada persona gana puntos como mucho una vez por tema: su primera respuesta con puntos (+10 o +5); las siguientes, 0;
 * - solo las 3 primeras correctas premiadas (de personas distintas) dan +10; una correcta después da 0 y no gasta la vez de esa persona;
 * - incorrecta, no_respuesta y pendiente dan 0.
 * Las valoraciones no cambian: solo los puntos. Es la única regla de puntos por respuestas (hilo y total del alumno).
 */
export function calcularPuntosRespuestas(comentarios: readonly ComentarioPuntuable[]): Map<string, number> {
  const instante = (c: ComentarioPuntuable) => new Date(c.creado).getTime();
  const ordenados = [...comentarios].sort((a, b) => instante(a) - instante(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const yaGanaron = new Set<string>();
  let correctasPremiadas = 0;
  const puntos = new Map<string, number>();
  for (const c of ordenados) {
    const base = PUNTOS_POR_VALIDACION[c.validacion];
    const sinHueco = c.validacion === "correcta" && correctasPremiadas >= MAX_CORRECTAS_CON_PUNTOS;
    if (base === 0 || yaGanaron.has(c.autorId) || sinHueco) {
      puntos.set(c.id, 0);
      continue;
    }
    puntos.set(c.id, base);
    yaGanaron.add(c.autorId);
    if (c.validacion === "correcta") correctasPremiadas++;
  }
  return puntos;
}

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
