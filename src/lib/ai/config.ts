/**
 * Configuración de la IA, leída de las variables de entorno (.env.local; ver .env.example).
 * Se lee en cada llamada para que los tests puedan cambiarla.
 */

/** Qué modelo usar: el mediano para el día a día o el grande para generar ejercicios. */
export type ModeloIA = "tutor" | "generador";

export interface ConfigIA {
  baseUrl: string;
  apiKey: string;
  modelos: Record<ModeloIA, string>;
  limiteDiario: number;
  salSeudonimos: string;
  /** Sin URL o sin clave, la IA funciona en modo simulado (respuestas fijas, sin red). */
  simulado: boolean;
}

export function getConfigIA(): ConfigIA {
  const baseUrl = (process.env.AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  const simulado = !baseUrl || !apiKey;

  const sal = (process.env.AI_SEUDONIMO_SAL ?? "").trim();
  if (!sal && !simulado) {
    throw new Error("Falta AI_SEUDONIMO_SAL en .env.local: es obligatoria cuando la IA es real.");
  }

  const limite = Number(process.env.AI_LIMITE_DIARIO);
  return {
    baseUrl,
    apiKey,
    modelos: {
      tutor: (process.env.AI_MODEL_TUTOR ?? "").trim(),
      generador: (process.env.AI_MODEL_GENERADOR ?? process.env.AI_MODEL_TUTOR ?? "").trim(),
    },
    limiteDiario: Number.isFinite(limite) && limite > 0 ? limite : 30,
    salSeudonimos: sal || "sal-solo-para-desarrollo",
    simulado,
  };
}
