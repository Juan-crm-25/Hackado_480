/**
 * Validador del foro (H10): decide si un comentario responde a la duda del tema y si es correcto,
 * aproximado o incorrecto. Instrucciones y criterios en agents/validador-foro.md.
 *
 * - Usa un modelo de DECISIÓN (Perplexity Decider V1.3 por OpenRouter, Decisions API), no un chat: devuelve una
 *   opción y su confianza, nunca texto. Las frases de Sensei las pone el código (src/lib/foro.ts).
 * - Solo recibe el texto de la duda y del comentario, filtrado (sin nombres, emails, teléfonos ni DNI).
 */
import { z } from "zod";
import { getConfigIAForo, type ConfigIAForo } from "../ai/config-foro";
import { filtrarTexto } from "../ai/privacidad";
import type { ValoracionRespuesta } from "../foro";
import { leerInstrucciones } from "./instrucciones";

/** Las cuatro opciones entre las que decide el modelo, en este orden. */
export const OPCIONES_VALIDADOR = ["no_respuesta", "correcta", "aproximada", "incorrecta"] as const;

/** Criterio de cada opción (el modelo los lee; el id de la pregunta no le llega). */
const CRITERIOS: Record<(typeof OPCIONES_VALIDADOR)[number], string> = {
  no_respuesta: "El comentario no intenta resolver la duda: agradecimientos, saludos, otra pregunta, bromas u otro tema.",
  correcta: "Responde a la duda y lo que explica es correcto y suficiente para resolverla.",
  aproximada: "Responde a la duda e intenta resolverla, pero es incompleta, imprecisa o tiene un fallo menor.",
  incorrecta: "Responde a la duda, pero lo que explica es falso o no la resuelve.",
};

export type ResultadoValidacionForo =
  | { tipo: "no_respuesta" }
  | { tipo: "respuesta"; valoracion: ValoracionRespuesta }
  /** Confianza baja: no se decide y el comentario queda pendiente para el profesor. */
  | { tipo: "dudosa" };

export class ErrorValidadorForo extends Error {}

export interface EntradaValidador {
  duda: { titulo: string; cuerpo: string };
  comentario: string;
  /** Nombres de los participantes, para quitarlos también del texto. */
  nombres?: string[];
}

export interface DependenciasValidador {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  config: ConfigIAForo;
}

const esquemaRespuesta = z.object({
  answers: z.object({
    valoracion: z.object({
      choice: z.enum(OPCIONES_VALIDADOR),
      confidence: z.number().min(0).max(1).optional(),
    }),
  }),
});

/** Modo simulado (sin clave): reglas fijas para poder desarrollar y probar sin red. */
function simular(comentario: string): ResultadoValidacionForo {
  const texto = comentario.trim();
  if (texto.length < 25 || texto.endsWith("?")) return { tipo: "no_respuesta" };
  return { tipo: "respuesta", valoracion: "aproximada" };
}

export async function validarComentarioForo(
  entrada: EntradaValidador,
  deps: DependenciasValidador = { fetch: (url, init) => fetch(url, init), config: getConfigIAForo() },
): Promise<ResultadoValidacionForo> {
  if (deps.config.simulado) return simular(entrada.comentario);

  const nombres = entrada.nombres ?? [];
  const duda = filtrarTexto(`${entrada.duda.titulo}\n${entrada.duda.cuerpo}`, nombres).texto;
  const comentario = filtrarTexto(entrada.comentario, nombres).texto;
  const estado = `DUDA DEL ALUMNO:\n${duda}\n\nCOMENTARIO DE OTRO ALUMNO:\n${comentario}`;

  let res: Response;
  try {
    res = await deps.fetch(`${deps.config.baseUrl}/alpha/decisions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${deps.config.apiKey}` },
      body: JSON.stringify({
        model: deps.config.modelo,
        state: estado,
        questions: {
          valoracion: { type: "choice", instructions: leerInstrucciones("validador-foro"), criteria: CRITERIOS },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new ErrorValidadorForo(`No se pudo llamar a la IA del foro: ${error instanceof Error ? error.message : error}`);
  }
  if (!res.ok) throw new ErrorValidadorForo(`La IA del foro respondió ${res.status}`);

  const datos = esquemaRespuesta.safeParse(await res.json().catch(() => null));
  if (!datos.success) throw new ErrorValidadorForo("La IA del foro devolvió una decisión no válida");

  const { choice, confidence = 1 } = datos.data.answers.valoracion;
  if (confidence < deps.config.umbralConfianza) return { tipo: "dudosa" };
  if (choice === "no_respuesta") return { tipo: "no_respuesta" };
  return { tipo: "respuesta", valoracion: choice };
}
