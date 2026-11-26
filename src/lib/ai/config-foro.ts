/**
 * Configuración de la IA del foro (H10), separada de la del tutor para no mezclar claves ni gasto.
 * Es un modelo de DECISIÓN (no de chat) servido por OpenRouter: Perplexity Decider V1.3 (gratis) por defecto.
 * Variables en .env.local (ver .env.example). Se lee en cada llamada para que los tests puedan cambiarla.
 */

export interface ConfigIAForo {
  /** Base de la API de OpenRouter; la Decisions API cuelga de `${baseUrl}/alpha/decisions`. */
  baseUrl: string;
  apiKey: string;
  modelo: string;
  /** Por debajo de esta confianza no se decide nada: el comentario queda pendiente para el profesor. */
  umbralConfianza: number;
  /** Sin clave, funciona en modo simulado (reglas fijas, sin red). */
  simulado: boolean;
}

export const MODELO_FORO_POR_DEFECTO = "perplexity/pplx-decider-v1.3:free";

export function getConfigIAForo(): ConfigIAForo {
  const apiKey = (process.env.AI_FORO_API_KEY ?? "").trim();
  const umbral = Number(process.env.AI_FORO_UMBRAL);
  return {
    baseUrl: ((process.env.AI_FORO_BASE_URL ?? "").trim() || "https://openrouter.ai/api").replace(/\/+$/, ""),
    apiKey,
    modelo: (process.env.AI_FORO_MODEL ?? "").trim() || MODELO_FORO_POR_DEFECTO,
    umbralConfianza: Number.isFinite(umbral) && umbral > 0 && umbral <= 1 ? umbral : 0.6,
    simulado: !apiKey,
  };
}
