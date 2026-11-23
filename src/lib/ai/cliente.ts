/**
 * Cliente ÚNICO hacia el proveedor de IA. Todos los agentes llaman a `completar`.
 *
 * - API compatible con OpenAI (/chat/completions): sirve para Scaleway, OVHcloud o cualquier otro
 *   cambiando solo AI_BASE_URL y los modelos en .env.local.
 * - Solo acepta `TextoSeguro` (ver privacidad.ts): no se puede enviar texto sin filtrar.
 * - Sin clave, funciona en modo simulado para que el equipo pueda trabajar sin ella.
 * - Nunca registra el contenido de los mensajes, solo el modelo y los tokens (para el coste).
 */
import { getConfigIA, type ModeloIA } from "./config";
import type { TextoSeguro } from "./privacidad";

export interface MensajeIA {
  rol: "sistema" | "usuario" | "asistente";
  contenido: TextoSeguro;
}

export interface OpcionesCompletar {
  modelo: ModeloIA;
  mensajes: MensajeIA[];
  /** Pide al modelo que responda con un objeto JSON (tarjetas, ejercicios, informes...). */
  formatoJson?: boolean;
  maxTokens?: number;
  temperatura?: number;
  /**
   * Cuánto "piensa" el modelo antes de responder. Esos tokens no se ven, pero se pagan y tardan.
   * Por defecto "none": con gemma-4 respuesta en ~0,5 s en vez de ~3 s y ~10 veces menos tokens.
   * Súbelo solo para tareas difíciles (generar ejercicios, corregir con rúbrica) si la calidad no basta.
   */
  razonamiento?: "none" | "low" | "medium" | "high";
}

export interface RespuestaIA {
  texto: string;
  simulado: boolean;
  tokens?: { entrada: number; salida: number };
}

export class ErrorIA extends Error {
  constructor(
    message: string,
    readonly estado?: number,
  ) {
    super(message);
    this.name = "ErrorIA";
  }
}

const ROLES = { sistema: "system", usuario: "user", asistente: "assistant" } as const;
const TIEMPO_MAXIMO_MS = 30_000;

export async function completar(opciones: OpcionesCompletar): Promise<RespuestaIA> {
  const config = getConfigIA();

  if (config.simulado) {
    return {
      texto: opciones.formatoJson ? "{}" : "[Modo simulado] La IA no está configurada (falta AI_BASE_URL o AI_API_KEY).",
      simulado: true,
    };
  }

  const modelo = config.modelos[opciones.modelo];
  if (!modelo) throw new ErrorIA(`Falta el modelo "${opciones.modelo}" en .env.local`);

  const cuerpo = {
    model: modelo,
    messages: opciones.mensajes.map((m) => ({ role: ROLES[m.rol], content: m.contenido })),
    max_tokens: opciones.maxTokens ?? 800,
    temperature: opciones.temperatura ?? 0.3,
    reasoning_effort: opciones.razonamiento ?? "none",
    ...(opciones.formatoJson ? { response_format: { type: "json_object" } } : {}),
  };

  // Un reintento si el proveedor está saturado (429) o falla (5xx).
  for (let intento = 1; ; intento++) {
    let res: Response;
    try {
      res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch (e) {
      if (intento < 2) continue;
      throw new ErrorIA(`No se pudo contactar con el proveedor de IA: ${(e as Error).name}`);
    }

    if ((res.status === 429 || res.status >= 500) && intento < 2) continue;
    if (!res.ok) throw new ErrorIA(`El proveedor de IA respondió ${res.status}`, res.status);

    const datos = (await res.json()) as {
      choices?: { message?: { content?: string | null }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const eleccion = datos.choices?.[0];
    const texto = eleccion?.message?.content;
    if (typeof texto !== "string" || texto === "") {
      throw new ErrorIA(
        eleccion?.finish_reason === "length"
          ? "Se agotaron los tokens antes de responder (sube maxTokens o baja el razonamiento)"
          : "Respuesta del proveedor sin contenido",
      );
    }

    const tokens = datos.usage
      ? { entrada: datos.usage.prompt_tokens ?? 0, salida: datos.usage.completion_tokens ?? 0 }
      : undefined;
    if (tokens) console.info(`[IA] ${opciones.modelo} (${modelo}): ${tokens.entrada} + ${tokens.salida} tokens`);

    return { texto, simulado: false, tokens };
  }
}
