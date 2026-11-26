/**
 * Corrector de ejercicios (issue #3). Instrucciones en agents/corrector.md.
 *
 * Pieza independiente: recibe una pregunta (tipo, solución o rúbrica y el momento del vídeo) y la respuesta del alumno,
 * y devuelve la puntuación, si es correcta y un feedback breve. No lee ni guarda nada en la BBDD, así que sirve igual
 * para el test de cada vídeo, el del módulo y el examen del curso.
 *
 * - Test y respuesta corta: con código, sin IA (no cuentan para el límite diario).
 * - Abierta y código: con la IA y la rúbrica. La respuesta pasa antes por el filtro de privacidad. Si la IA falla o no
 *   está segura, la pregunta queda para revisión humana.
 */
import { completar as completarIA } from "../ai/cliente";
import { contenidoDelCurso, filtrarTexto } from "../ai/privacidad";
import type { EjercicioBase, ReferenciaVideo, TipoEjercicio } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { parsearObjetoJson } from "./validacion";

/** Lo que hace falta de un ejercicio para corregirlo. */
export interface PreguntaCorregible extends EjercicioBase {
  /** Momento del vídeo que hay que repasar si falla. */
  referencia: ReferenciaVideo;
}

export interface Correccion {
  /** De 0 a 1. */
  puntuacion: number;
  correcto: boolean;
  feedback: string;
  /** Solo si no es correcta. */
  repasar?: ReferenciaVideo;
  /** La IA no ha podido corregirla con seguridad: la revisará una persona. */
  revisionHumana: boolean;
}

export interface DependenciasCorrector {
  completar: typeof completarIA;
}

/** Puntuación de cada nivel de la rúbrica. Solo la respuesta completa cuenta como correcta. */
const PUNTOS = { completa: 1, parcial: 0.5, incorrecta: 0 } as const;
type Nivel = keyof typeof PUNTOS;
const MAX_FEEDBACK = 500;
/** Lo que se manda de la respuesta del alumno a la IA como mucho. */
const MAX_RESPUESTA = 4000;

const CORRECTO = "¡Correcto!";
const FALLO = "No es correcto. Repasa este momento del vídeo.";
const VACIA = "No has respondido. Repasa este momento del vídeo.";
const SIN_CORREGIR = "No he podido corregir tu respuesta ahora mismo. La revisará tu profesor.";

/** Si el tipo se corrige con IA: cada corrección cuenta como una consulta del límite diario. */
export function necesitaIA(tipo: TipoEjercicio): boolean {
  return tipo === "abierta" || tipo === "codigo";
}

/**
 * Corrige una respuesta. Nunca lanza: si la IA falla, devuelve 0 puntos con revisión humana.
 * `nombresOcultos`: nombres que el filtro de privacidad debe quitar de la respuesta (p. ej. el del alumno).
 */
export async function corregir(
  pregunta: PreguntaCorregible,
  respuesta: string | number,
  opciones: { nombresOcultos?: string[] } = {},
  deps: DependenciasCorrector = { completar: completarIA },
): Promise<Correccion> {
  const texto = String(respuesta ?? "").trim();
  if (!texto) return fallo(pregunta, VACIA);

  switch (pregunta.tipo) {
    case "test": {
      const elegida = Number(texto);
      return Number.isInteger(elegida) && elegida === pregunta.solucion ? acierto() : fallo(pregunta, FALLO);
    }
    case "respuesta_corta":
      return respuestaCortaCoincide(texto, String(pregunta.solucion ?? "")) ? acierto() : fallo(pregunta, FALLO);
    default:
      return corregirConIA(pregunta, texto, opciones.nombresOcultos ?? [], deps);
  }
}

const acierto = (): Correccion => ({ puntuacion: 1, correcto: true, feedback: CORRECTO, revisionHumana: false });
const fallo = (p: PreguntaCorregible, feedback: string, revisionHumana = false): Correccion => ({
  puntuacion: 0,
  correcto: false,
  feedback,
  repasar: p.referencia,
  revisionHumana,
});

/**
 * Corrección flexible de una respuesta corta: no distingue mayúsculas, tildes, espacios, comillas, la puntuación del
 * final ni unos `()` al final (addEventListener() = addEventListener). Los números valen con coma o punto y con ceros
 * de más (1,5 = 1.5; 16.0 = 16). Las unidades sí cuentan: 48 no es 48px.
 */
export function respuestaCortaCoincide(respuesta: string, solucion: string): boolean {
  const a = normalizarCorta(respuesta);
  const b = normalizarCorta(solucion);
  if (!a || !b) return false;
  if (a === b) return true;
  const [na, nb] = [comoNumero(a), comoNumero(b)];
  return na !== null && na === nb;
}

function normalizarCorta(v: string): string {
  let t = v
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // tildes
    .toLowerCase()
    .replace(/[`"'«»“”‘’]/g, "")
    .replace(/\s+/g, "");
  // Puntuación y () del final, en cualquier orden: «addEventListener();»
  for (let antes = ""; antes !== t; ) {
    antes = t;
    t = t.replace(/[.;,:!?]+$/, "").replace(/\(\)$/, "");
  }
  return t;
}

function comoNumero(v: string): number | null {
  return /^-?\d+(?:[.,]\d+)?$/.test(v) ? Number(v.replace(",", ".")) : null;
}

async function corregirConIA(
  pregunta: PreguntaCorregible,
  respuesta: string,
  nombresOcultos: string[],
  deps: DependenciasCorrector,
): Promise<Correccion> {
  const sistema = rellenar(leerInstrucciones("corrector"), {
    tipo: pregunta.tipo === "codigo" ? "código" : "respuesta abierta",
    enunciado: pregunta.enunciado,
    rubrica: pregunta.rubrica?.trim() || "Ninguna: valora si responde bien al enunciado.",
    solucion: typeof pregunta.solucion === "string" && pregunta.solucion.trim() ? pregunta.solucion : "Ninguna.",
  });

  try {
    const r = await deps.completar({
      modelo: "tutor",
      formatoJson: true,
      maxTokens: 400,
      temperatura: 0,
      mensajes: [
        { rol: "sistema", contenido: contenidoDelCurso(sistema) },
        { rol: "usuario", contenido: filtrarTexto(respuesta.slice(0, MAX_RESPUESTA), nombresOcultos).texto },
      ],
    });
    const correccion = r.simulado ? null : interpretarCorreccion(r.texto);
    if (!correccion) return fallo(pregunta, SIN_CORREGIR, true);
    return correccion.correcto ? correccion : { ...correccion, repasar: pregunta.referencia };
  } catch {
    return fallo(pregunta, SIN_CORREGIR, true);
  }
}

/**
 * Valida lo que devuelve el modelo: `{ "nivel": "completa" | "parcial" | "incorrecta", "feedback", "seguro" }`.
 * Devuelve null si no lo cumple. Sin el minuto que repasar: lo pone quien llama.
 */
export function interpretarCorreccion(texto: string): Correccion | null {
  const datos = parsearObjetoJson(texto);
  if (!datos) return null;
  const nivel = datos.nivel as Nivel;
  const feedback = typeof datos.feedback === "string" ? datos.feedback.trim() : "";
  if (typeof nivel !== "string" || !Object.hasOwn(PUNTOS, nivel) || !feedback) return null;
  return {
    puntuacion: PUNTOS[nivel],
    correcto: nivel === "completa",
    feedback: feedback.length > MAX_FEEDBACK ? `${feedback.slice(0, MAX_FEEDBACK - 1).trimEnd()}…` : feedback,
    revisionHumana: datos.seguro !== true,
  };
}
