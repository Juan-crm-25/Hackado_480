/**
 * Agente tutor del módulo (issue #1). Instrucciones en agents/tutor.md.
 *
 * Flujo: temario del módulo + pregunta FILTRADA → modelo (JSON) → validación de la respuesta.
 * Ningún dato identificable del alumno llega a la IA.
 */
import { completar as completarIA, type MensajeIA } from "../ai/cliente";
import { contenidoDelCurso, filtrarTexto } from "../ai/privacidad";
import { temarioDelModulo } from "../transcripciones";
import type { Curso, Mensaje, Modulo, ReferenciaVideo } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { quitarBloqueCodigo, validarFuentes } from "./validacion";

/** Cuántos mensajes anteriores se envían como contexto. Más mensajes = más tokens. */
export const MAX_HISTORIAL = 6;
const MAX_FUENTES = 3;

export interface EntradaTutor {
  curso: Curso;
  modulo: Modulo;
  pregunta: string;
  historial?: Mensaje[];
  /** Nombres que hay que ocultar antes de enviar nada (el del alumno, como mínimo). */
  nombresOcultos: string[];
}

export interface SalidaTutor {
  mensaje: Mensaje;
  fueraDeTemario: boolean;
  simulado: boolean;
}

/** Dependencias inyectables para los tests. */
export interface DependenciasTutor {
  completar: typeof completarIA;
  temario: (modulo: Modulo) => string;
}

const dependenciasReales: DependenciasTutor = { completar: completarIA, temario: (m) => temarioDelModulo(m) };

export async function preguntarAlTutor(
  entrada: EntradaTutor,
  deps: DependenciasTutor = dependenciasReales,
): Promise<SalidaTutor> {
  const { curso, modulo, nombresOcultos } = entrada;

  const temario = deps.temario(modulo);
  if (!temario) {
    // Sin transcripciones el tutor no tiene de dónde responder: ni se llama a la IA.
    return {
      mensaje: {
        rol: "tutor",
        texto: `Todavía no tengo el contenido de los vídeos del módulo «${modulo.titulo}», así que no puedo responder dudas sobre él. ¡Pronto estará disponible!`,
        fuentes: [],
      },
      fueraDeTemario: false,
      simulado: false,
    };
  }

  const sistema = rellenar(leerInstrucciones("tutor"), {
    modulo: modulo.titulo,
    curso: curso.titulo,
    otros_modulos:
      curso.modulos
        .filter((m) => m.id !== modulo.id)
        .map((m) => `- «${m.titulo}»: ${m.conceptos.map((c) => c.nombre).join(", ")}`)
        .join("\n") || "(ninguno)",
    temario,
  });

  const mensajes: MensajeIA[] = [{ rol: "sistema", contenido: contenidoDelCurso(sistema) }];
  // El historial llega del navegador: se filtra entero, también lo que dijo el tutor.
  for (const m of (entrada.historial ?? []).slice(-MAX_HISTORIAL)) {
    mensajes.push({
      rol: m.rol === "alumno" ? "usuario" : "asistente",
      contenido: filtrarTexto(m.texto, nombresOcultos).texto,
    });
  }
  mensajes.push({ rol: "usuario", contenido: filtrarTexto(entrada.pregunta, nombresOcultos).texto });

  const r = await deps.completar({ modelo: "tutor", mensajes, formatoJson: true, maxTokens: 600, temperatura: 0.2 });

  if (r.simulado) {
    return {
      mensaje: {
        rol: "tutor",
        texto: `[Modo simulado] Soy el tutor del módulo «${modulo.titulo}». Configura la IA en .env.local para recibir respuestas reales.`,
        fuentes: [],
      },
      fueraDeTemario: false,
      simulado: true,
    };
  }

  const { respuesta, fueraDeTemario, fuentes } = interpretarRespuesta(r.texto, modulo);
  return { mensaje: { rol: "tutor", texto: respuesta, fuentes }, fueraDeTemario, simulado: false };
}

/**
 * Valida lo que devuelve el modelo: nunca se confía en él a ciegas.
 * - Acepta JSON con o sin bloque ```json alrededor.
 * - Si no es JSON, usa el texto tal cual (sin fuentes).
 * - Descarta fuentes de vídeos que no son del módulo y ajusta los segundos a la duración.
 */
export function interpretarRespuesta(
  texto: string,
  modulo: Modulo,
): { respuesta: string; fueraDeTemario: boolean; fuentes: ReferenciaVideo[] } {
  const datos = leerJsonTolerante(quitarBloqueCodigo(texto));

  const sinCampos = typeof datos.respuesta === "string" ? limpiarTexto(datos.respuesta) : "";
  const respuesta = sinCampos
    ? sinCampos.charAt(0).toUpperCase() + sinCampos.slice(1)
    : "No he podido generar una respuesta. Prueba a reformular la pregunta.";
  const fueraDeTemario = datos.fuera_de_temario === true;

  const fuentes = fueraDeTemario ? [] : validarFuentes(datos.fuentes, modulo, MAX_FUENTES);

  return { respuesta, fueraDeTemario, fuentes };
}

type DatosModelo = { respuesta?: unknown; fuera_de_temario?: unknown; fuentes?: unknown };

/**
 * El modelo a veces devuelve JSON mal formado. Se intenta, por orden:
 * JSON completo → el primer {...} del texto → sacar "respuesta" con una expresión regular → el texto tal cual.
 */
function leerJsonTolerante(texto: string): DatosModelo {
  const intentos = [texto, texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1)];
  for (const candidato of intentos) {
    try {
      const datos = JSON.parse(candidato);
      if (datos && typeof datos === "object") return datos as DatosModelo;
    } catch {
      // siguiente intento
    }
  }
  const respuesta = /"respuesta"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(texto)?.[1];
  const fuera = /"fuera_de_temario"\s*:\s*(true|false)/.exec(texto)?.[1];
  if (respuesta !== undefined) {
    return { respuesta: JSON.parse(`"${respuesta}"`), fuera_de_temario: fuera === "true" };
  }
  return { respuesta: texto, fuera_de_temario: fuera === "true" };
}

/**
 * Quita restos de formato que el modelo cuela a veces en el texto para el alumno:
 * nombres de campos ("fuera_de_temario: true, ...", "\"explicación\": \"...\"}") y comillas o llaves sueltas.
 */
function limpiarTexto(texto: string): string {
  return texto
    .replace(/^\s*"?fuera_de_temario"?\s*:\s*(true|false)\s*[.,;:]?\s*/i, "")
    .replace(/^\s*\{?\s*"[\p{L}_ ]{1,30}"\s*:\s*"/u, "")
    .replace(/"\s*\.?\s*\}?\s*$/u, (m) => (m.includes(".") ? "." : ""))
    .replace(/«([^»"\n]*)"/gu, "«$1»") // «Maquetación responsive" → «Maquetación responsive»
    .replace(/«([^»\n]*?)(\.?)$/u, "«$1»$2") // «Maquetación responsive. → «Maquetación responsive».
    // Las marcas del temario ([v04 @95] o (v04 @95)) son para el modelo: al alumno le llegan como enlaces al minuto.
    .replace(/\s*[[(]v\d+\s*@\s*\d+[\])]/g, "")
    .trim();
}
