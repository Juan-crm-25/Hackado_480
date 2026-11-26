/**
 * Analista del Radar (#5): resume para el profesor las dudas que los alumnos hacen al tutor IA.
 * Instrucciones en agents/analista-radar.md.
 *
 * - Solo recibe TEXTOS de preguntas (ya filtrados al guardarlos) y números: nunca quién preguntó.
 * - Las preguntas son texto de alumnos: van en el mensaje del usuario, filtradas otra vez, nunca en las instrucciones.
 */
import { completar as completarIA } from "../ai/cliente";
import { contenidoDelCurso, filtrarTexto } from "../ai/privacidad";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { parsearObjetoJson } from "./validacion";

/** Como mucho, estas preguntas distintas por módulo (las más repetidas): acota los tokens. */
export const MAXIMO_PREGUNTAS_POR_MODULO = 40;
const MINIMO_RESUMEN = 20;
const MAXIMO_RESUMEN = 1200;

export interface EntradaAnalista {
  curso: string;
  fallados: { concepto: string; modulo: string; porcentajeFallo: number }[];
  /** Preguntas distintas por módulo, con cuántas veces se han hecho. */
  dudas: { modulo: string; preguntas: { texto: string; veces: number }[] }[];
}

export class ErrorAnalista extends Error {}

export interface DependenciasAnalista {
  completar: typeof completarIA;
}

export async function resumirDudas(
  entrada: EntradaAnalista,
  deps: DependenciasAnalista = { completar: completarIA },
): Promise<{ resumen: string }> {
  const dudas = entrada.dudas.filter((d) => d.preguntas.length > 0);
  if (dudas.length === 0) {
    return { resumen: "Los alumnos todavía no han hecho preguntas al tutor en las dos últimas semanas." };
  }

  const fallados = entrada.fallados.length
    ? entrada.fallados.map((f) => `- ${f.concepto} (${f.modulo}): ${Math.round(f.porcentajeFallo * 100)} % de fallos`).join("\n")
    : "(aún no hay datos suficientes)";
  const sistema = rellenar(leerInstrucciones("analista-radar"), { curso: entrada.curso, fallados });

  const listado = dudas
    .map((d) => {
      const preguntas = [...d.preguntas]
        .sort((a, b) => b.veces - a.veces)
        .slice(0, MAXIMO_PREGUNTAS_POR_MODULO)
        .map((p) => `- ${p.texto.replace(/\s+/g, " ").trim()} · ${p.veces}`);
      return [`## ${d.modulo}`, ...preguntas].join("\n");
    })
    .join("\n\n");

  const r = await deps.completar({
    modelo: "tutor",
    formatoJson: true,
    maxTokens: 500,
    temperatura: 0.3,
    mensajes: [
      { rol: "sistema", contenido: contenidoDelCurso(sistema) },
      // Texto de alumnos: se filtra otra vez (ya se guardó filtrado) y va como mensaje del usuario.
      { rol: "usuario", contenido: filtrarTexto(`DUDAS POR MÓDULO (pregunta · veces)\n\n${listado}`).texto },
    ],
  });
  if (r.simulado) throw new ErrorAnalista("La IA está en modo simulado: no se puede resumir.");

  const resumen = parsearObjetoJson(r.texto)?.resumen;
  if (typeof resumen !== "string") throw new ErrorAnalista("El modelo no devolvió un resumen válido.");
  const limpio = resumen.trim();
  if (limpio.length < MINIMO_RESUMEN || limpio.length > MAXIMO_RESUMEN) {
    throw new ErrorAnalista("El resumen del modelo no tiene una longitud razonable.");
  }
  return { resumen: limpio };
}
