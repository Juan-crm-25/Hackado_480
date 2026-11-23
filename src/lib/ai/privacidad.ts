/**
 * Filtro de privacidad: NADA llega a la IA sin pasar por aquí.
 *
 * - El cliente de IA (cliente.ts) solo acepta `TextoSeguro`, y la única forma de obtenerlo
 *   es con `filtrarTexto` (texto del alumno) o `contenidoDelCurso` (temario, ejemplos del profesor).
 *   Así TypeScript impide enviar a la IA un texto sin filtrar.
 * - La identidad del alumno se sustituye por un seudónimo estable (HMAC). La relación
 *   seudónimo ↔ alumno solo existe en nuestro servidor.
 *
 * Es código y no IA a propósito: es predecible, se puede probar y no envía nada a nadie.
 * Ver SPEC.md, apartado 6.
 */
import { createHmac } from "node:crypto";
import { getConfigIA } from "./config";

declare const marcaTextoSeguro: unique symbol;
/** Texto apto para enviarse a la IA. Solo lo crean `filtrarTexto` y `contenidoDelCurso`. */
export type TextoSeguro = string & { readonly [marcaTextoSeguro]: true };

export type TipoDatoPersonal = "email" | "iban" | "tarjeta" | "dni" | "telefono" | "nombre";

export interface ResultadoFiltro {
  texto: TextoSeguro;
  /** Cuántos datos de cada tipo se han eliminado (para métricas; nunca el dato en sí). */
  eliminados: Partial<Record<TipoDatoPersonal, number>>;
}

/** El orden importa: primero los patrones más largos para que no los corte uno más corto. */
const PATRONES: ReadonlyArray<[TipoDatoPersonal, RegExp, string]> = [
  ["email", /[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[a-z]{2,}/giu, "[EMAIL]"],
  ["iban", /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){4,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g, "[IBAN]"],
  ["tarjeta", /\b\d(?:[ -]?\d){12,18}\b/g, "[TARJETA]"],
  // DNI (12345678Z) y NIE (X1234567L), con o sin guion o espacio
  ["dni", /\b(?:\d{8}|[XYZ][ -]?\d{7})[ -]?[A-Z]\b/gi, "[DNI]"],
  // Teléfonos españoles de 9 cifras (empiezan por 6, 7, 8 o 9), con prefijo opcional
  ["telefono", /(?:(?:\+|\b00)34[ -]?)?\b[6-9](?:[ -]?\d){8}\b/g, "[TELEFONO]"],
];

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Quita datos personales del texto libre (preguntas o respuestas del alumno).
 * @param nombresConocidos nombres que no deben salir (el del propio alumno, compañeros, tutor...).
 *   Se elimina el nombre completo y cada una de sus partes de 3 letras o más.
 */
export function filtrarTexto(texto: string, nombresConocidos: string[] = []): ResultadoFiltro {
  const eliminados: Partial<Record<TipoDatoPersonal, number>> = {};
  let resultado = texto;

  for (const [tipo, patron, sustituto] of PATRONES) {
    resultado = resultado.replace(patron, () => {
      eliminados[tipo] = (eliminados[tipo] ?? 0) + 1;
      return sustituto;
    });
  }

  const partes = new Set<string>();
  for (const nombre of nombresConocidos) {
    const limpio = nombre.trim();
    if (!limpio) continue;
    partes.add(limpio);
    for (const parte of limpio.split(/\s+/)) if (parte.length >= 3) partes.add(parte);
  }
  // Primero los más largos, para sustituir "Lucía Martín" entero antes que "Lucía".
  for (const parte of [...partes].sort((a, b) => b.length - a.length)) {
    const patron = new RegExp(`(?<![\\p{L}\\p{N}])${escaparRegex(parte)}(?![\\p{L}\\p{N}])`, "giu");
    resultado = resultado.replace(patron, () => {
      eliminados.nombre = (eliminados.nombre ?? 0) + 1;
      return "[NOMBRE]";
    });
  }

  return { texto: resultado as TextoSeguro, eliminados };
}

/**
 * Marca como seguro el contenido del curso: transcripciones, conceptos, ejemplos del profesor
 * e instrucciones de los agentes. NUNCA lo uses con texto escrito por un alumno.
 */
export function contenidoDelCurso(texto: string): TextoSeguro {
  return texto as TextoSeguro;
}

/** Seudónimo estable para un alumno (p. ej. "alumno_3f9a1c"). No permite recuperar el id sin la sal. */
export function seudonimo(alumnoId: string): string {
  const { salSeudonimos } = getConfigIA();
  const hash = createHmac("sha256", salSeudonimos).update(alumnoId).digest("hex");
  return `alumno_${hash.slice(0, 6)}`;
}

/** Recupera el alumno a partir de su seudónimo, comparando con los alumnos conocidos. Solo en servidor. */
export function reidentificar(seud: string, alumnoIds: string[]): string | undefined {
  return alumnoIds.find((id) => seudonimo(id) === seud);
}
