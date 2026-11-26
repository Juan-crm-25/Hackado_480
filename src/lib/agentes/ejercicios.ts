/**
 * Generador de ejercicios de verificación (issue #4). Instrucciones en agents/generador-ejercicios.md.
 * Se ejecuta una vez por módulo desde un script, nunca por petición de un alumno.
 * La IA solo devuelve JSON: este fichero lo valida y el código que llama lo guarda como borrador.
 *
 * Cada módulo tiene tres bancos, uno por `uso`, que se piden por separado:
 * - «video»: 2 preguntas fáciles por vídeo (test o respuesta corta), el test que desbloquea el siguiente vídeo.
 * - «modulo»: 3 por concepto; el test del módulo coge entre 5 y 8 de aquí (#3).
 * - «examen»: unas pocas más difíciles para el examen del curso, que pueden mezclar conceptos de módulos anteriores.
 */
import { completar as completarIA } from "../ai/cliente";
import { contenidoDelCurso } from "../ai/privacidad";
import { temarioDelModulo } from "../transcripciones";
import type { Ejercicio, Modulo, PlantillaEjercicios, TipoEjercicio, UsoEjercicio } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { parsearObjetoJson, validarFuentes } from "./validacion";

/** Ejercicios que se piden por concepto: 3 conceptos por módulo dan un banco de 9. */
export const EJERCICIOS_POR_CONCEPTO = 3;
/** Si quedan menos ejercicios válidos, no se guarda nada. */
export const MINIMO_EJERCICIOS = 6;
/** Preguntas del test de cada vídeo. Si a algún vídeo le faltan, no se guarda nada. */
export const PREGUNTAS_POR_VIDEO = 2;
/** Preguntas de examen que aporta cada módulo, y las mínimas para guardarlas. */
export const PREGUNTAS_EXAMEN = 3;
export const MINIMO_PREGUNTAS_EXAMEN = 2;
/** Tipos del test de vídeo: rápidos y corregidos con código. */
const TIPOS_VIDEO: TipoEjercicio[] = ["test", "respuesta_corta"];
/** Opciones de un ejercicio tipo test. */
const MINIMO_OPCIONES = 2;
const MAXIMO_OPCIONES = 5;

/** Ejercicio ya validado, antes de guardarlo: aún sin id y sin estado (se guarda como borrador). */
export type EjercicioGenerado = Omit<Ejercicio, "id" | "estado">;

export interface DependenciasEjercicios {
  completar: typeof completarIA;
  temario: (modulo: Modulo) => string;
}

const dependenciasReales: DependenciasEjercicios = { completar: completarIA, temario: (m) => temarioDelModulo(m) };

// ─── Banco del módulo ────────────────────────────────────────────────────────

/**
 * Pide a la IA el banco de ejercicios del módulo a partir de la plantilla del profesor y lo valida.
 * No guarda nada: devuelve los ejercicios válidos para que el código que llama los guarde como borrador.
 * A la IA solo le llega contenido del curso (temario, conceptos y plantilla), ningún dato de alumnos.
 */
export async function generarEjercicios(
  modulo: Modulo,
  plantilla: PlantillaEjercicios,
  deps: DependenciasEjercicios = dependenciasReales,
): Promise<EjercicioGenerado[]> {
  const sistema = rellenar(leerInstrucciones("generador-ejercicios"), {
    ...comunes(modulo, plantilla, plantilla.tipos, deps),
    total: String(modulo.conceptos.length * EJERCICIOS_POR_CONCEPTO),
  });
  return validarEjercicios(await pedir(sistema, "Genera los ejercicios del módulo.", deps), modulo, plantilla);
}

/**
 * Valida y limpia lo que devuelve el modelo: los ejercicios agrupados por concepto,
 * `{ "conceptos": [{ "conceptoId", "ejercicios": [...] }] }`. El concepto de cada ejercicio es el de su grupo: si se
 * pedía en cada ejercicio, el modelo lo olvidaba en los que no eran de test. Descarta cada ejercicio que no cumple
 * las reglas de su tipo o que cita un concepto o un vídeo que no es del módulo, quita repetidos y se queda con
 * EJERCICIOS_POR_CONCEPTO por concepto. Lanza un error si quedan menos de MINIMO_EJERCICIOS o si algún concepto
 * se queda sin ejercicios: en ese caso no se guarda nada.
 */
export function validarEjercicios(respuesta: string, modulo: Modulo, plantilla: PlantillaEjercicios): EjercicioGenerado[] {
  const ejercicios = sinRepetir(
    porConcepto(respuesta).map((e) => validarUno(e, modulo, plantilla.tipos, "modulo")),
    (e, elegidos) => elegidos.filter((x) => x.conceptoId === e.conceptoId).length < EJERCICIOS_POR_CONCEPTO,
  );

  if (ejercicios.length < MINIMO_EJERCICIOS) {
    throw new Error(`Ejercicios insuficientes: ${ejercicios.length} válidos (mínimo ${MINIMO_EJERCICIOS}).`);
  }
  const sinEjercicios = modulo.conceptos.filter((c) => !ejercicios.some((e) => e.conceptoId === c.id));
  if (sinEjercicios.length > 0) {
    throw new Error(`Conceptos sin ningún ejercicio válido: ${sinEjercicios.map((c) => c.nombre).join(", ")}.`);
  }
  return ejercicios;
}

// ─── Test de cada vídeo ──────────────────────────────────────────────────────

/** Los tipos de la plantilla que sirven para el test de vídeo; si no hay ninguno, test. */
function tiposDeVideo(plantilla: PlantillaEjercicios): TipoEjercicio[] {
  const tipos = TIPOS_VIDEO.filter((t) => plantilla.tipos.includes(t));
  return tipos.length > 0 ? tipos : ["test"];
}

/**
 * Pide a la IA las PREGUNTAS_POR_VIDEO preguntas del test de cada vídeo del módulo: fáciles, de test o respuesta
 * corta (de los que permita la plantilla), sobre lo que explica ese vídeo. No guarda nada.
 */
export async function generarPreguntasVideo(
  modulo: Modulo,
  plantilla: PlantillaEjercicios,
  deps: DependenciasEjercicios = dependenciasReales,
): Promise<EjercicioGenerado[]> {
  const sistema = rellenar(leerInstrucciones("generador-ejercicios", "video"), {
    ...comunes(modulo, plantilla, tiposDeVideo(plantilla), deps),
    videos: modulo.videos.map((v) => `- ${v.id}: ${v.titulo}`).join("\n"),
    por_video: String(PREGUNTAS_POR_VIDEO),
  });
  return validarPreguntasVideo(await pedir(sistema, "Genera las preguntas de cada vídeo.", deps), modulo, plantilla);
}

/**
 * Valida las preguntas de vídeo, agrupadas por vídeo: `{ "videos": [{ "videoId", "ejercicios": [...] }] }`.
 * Cada pregunta lleva su "conceptoId" y el "segundo" del vídeo de su grupo. Mismas reglas por tipo que el banco,
 * pero solo test y respuesta corta, y PREGUNTAS_POR_VIDEO por vídeo como mucho. Si a algún vídeo del módulo le
 * faltan, lanza un error y no se guarda nada.
 */
export function validarPreguntasVideo(respuesta: string, modulo: Modulo, plantilla: PlantillaEjercicios): EjercicioGenerado[] {
  const datos = parsearObjetoJson(respuesta);
  if (!datos) throw new Error("El modelo no devolvió JSON válido.");
  const grupos = Array.isArray(datos.videos) ? (datos.videos as Record<string, unknown>[]) : [];
  const lista = grupos.flatMap((g) =>
    Array.isArray(g?.ejercicios)
      ? (g.ejercicios as Record<string, unknown>[]).map((e) => ({ ...e, fuente: { videoId: g.videoId, segundo: e?.segundo } }))
      : [],
  );

  const tipos = tiposDeVideo(plantilla);
  const preguntas = sinRepetir(
    lista.map((e) => validarUno(e, modulo, tipos, "video")),
    (e, elegidas) => elegidas.filter((x) => x.referencia.videoId === e.referencia.videoId).length < PREGUNTAS_POR_VIDEO,
  );

  const incompletos = modulo.videos.filter(
    (v) => preguntas.filter((p) => p.referencia.videoId === v.id).length < PREGUNTAS_POR_VIDEO,
  );
  if (incompletos.length > 0) {
    throw new Error(`Vídeos sin sus ${PREGUNTAS_POR_VIDEO} preguntas válidas: ${incompletos.map((v) => v.id).join(", ")}.`);
  }
  return preguntas;
}

// ─── Examen del curso ────────────────────────────────────────────────────────

/**
 * Pide a la IA las PREGUNTAS_EXAMEN preguntas que este módulo aporta al examen del curso: más difíciles que las del
 * módulo y, alguna, mezclando conceptos de módulos anteriores (`anteriores`, en el orden del curso). Siempre citan un
 * vídeo de ESTE módulo, el más avanzado de lo que piden. No guarda nada.
 */
export async function generarPreguntasExamen(
  modulo: Modulo,
  plantilla: PlantillaEjercicios,
  anteriores: Modulo[],
  deps: DependenciasEjercicios = dependenciasReales,
): Promise<EjercicioGenerado[]> {
  const sistema = rellenar(leerInstrucciones("generador-ejercicios", "examen"), {
    ...comunes(modulo, plantilla, plantilla.tipos, deps),
    total: String(PREGUNTAS_EXAMEN),
    anteriores:
      anteriores.length === 0
        ? "Ninguno: es el primer módulo."
        : anteriores.map((m) => `- ${m.titulo}: ${m.conceptos.map((c) => c.nombre).join(", ")}`).join("\n"),
    temario_anteriores: anteriores.map((m) => deps.temario(m)).filter(Boolean).join("\n") || "-",
  });
  return validarPreguntasExamen(await pedir(sistema, "Genera las preguntas de examen del módulo.", deps), modulo, plantilla);
}

/**
 * Valida las preguntas de examen: mismo formato y reglas que el banco del módulo (agrupadas por concepto del módulo),
 * pero PREGUNTAS_EXAMEN en total, de cualquier concepto. Si quedan menos de MINIMO_PREGUNTAS_EXAMEN, lanza un error.
 */
export function validarPreguntasExamen(respuesta: string, modulo: Modulo, plantilla: PlantillaEjercicios): EjercicioGenerado[] {
  const preguntas = sinRepetir(
    porConcepto(respuesta).map((e) => validarUno(e, modulo, plantilla.tipos, "examen")),
    (_, elegidas) => elegidas.length < PREGUNTAS_EXAMEN,
  );
  if (preguntas.length < MINIMO_PREGUNTAS_EXAMEN) {
    throw new Error(`Preguntas de examen insuficientes: ${preguntas.length} válidas (mínimo ${MINIMO_PREGUNTAS_EXAMEN}).`);
  }
  return preguntas;
}

// ─── Comunes ─────────────────────────────────────────────────────────────────

/** Variables que comparten los tres prompts. Falla si el módulo no tiene transcripciones. */
function comunes(modulo: Modulo, plantilla: PlantillaEjercicios, tipos: TipoEjercicio[], deps: DependenciasEjercicios) {
  const temario = deps.temario(modulo);
  if (!temario) throw new Error(`El módulo «${modulo.titulo}» no tiene transcripciones: no hay de dónde generar ejercicios.`);
  const ejemplos = plantilla.ejemplos.filter((e) => tipos.includes(e.tipo)).map(enOrden);
  return {
    modulo: modulo.titulo,
    conceptos: modulo.conceptos.map((c) => `- ${c.id}: ${c.nombre}`).join("\n"),
    tipos: tipos.join(", "),
    ejemplos: JSON.stringify(ejemplos, null, 2),
    indicaciones: plantilla.indicaciones?.trim() || "Ninguna.",
    temario,
  };
}

/** Llama al modelo generador. A la IA solo le llega contenido del curso. */
async function pedir(sistema: string, peticion: string, deps: DependenciasEjercicios): Promise<string> {
  const r = await deps.completar({
    modelo: "generador",
    formatoJson: true,
    maxTokens: 6000,
    temperatura: 0.4,
    mensajes: [
      { rol: "sistema", contenido: contenidoDelCurso(sistema) },
      { rol: "usuario", contenido: contenidoDelCurso(peticion) },
    ],
  });
  if (r.simulado) throw new Error("La IA está en modo simulado: configura AI_BASE_URL y AI_API_KEY en .env.local.");
  return r.texto;
}

/**
 * Un ejemplo del profesor con sus claves siempre en el mismo orden. La BBDD (jsonb) reordena las claves de los
 * objetos, y el modelo copia la forma de los ejemplos: con "solucion" antes que "enunciado" se olvidaba de "conceptoId".
 */
function enOrden(ejemplo: PlantillaEjercicios["ejemplos"][number]) {
  const { tipo, enunciado, opciones, solucion, rubrica } = ejemplo;
  return { tipo, enunciado, opciones, solucion, rubrica }; // JSON.stringify omite las que no existen
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** Para detectar enunciados repetidos: minúsculas y sin espacios de más. */
const normalizar = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

/** Los ejercicios de una respuesta agrupada por concepto, cada uno con el "conceptoId" de su grupo. */
function porConcepto(respuesta: string): Record<string, unknown>[] {
  const datos = parsearObjetoJson(respuesta);
  if (!datos) throw new Error("El modelo no devolvió JSON válido.");
  const grupos = Array.isArray(datos.conceptos) ? (datos.conceptos as Record<string, unknown>[]) : [];
  return grupos.flatMap((g) =>
    Array.isArray(g?.ejercicios)
      ? (g.ejercicios as Record<string, unknown>[]).map((e) => ({ ...e, conceptoId: g.conceptoId }))
      : [],
  );
}

/** Se queda con los válidos (no null), sin enunciados repetidos y mientras `cabe` lo permita. */
function sinRepetir(
  candidatos: (EjercicioGenerado | null)[],
  cabe: (e: EjercicioGenerado, elegidos: EjercicioGenerado[]) => boolean,
): EjercicioGenerado[] {
  const elegidos: EjercicioGenerado[] = [];
  const vistos = new Set<string>();
  for (const e of candidatos) {
    if (!e) continue;
    const clave = normalizar(e.enunciado);
    if (vistos.has(clave) || !cabe(e, elegidos)) continue;
    vistos.add(clave);
    elegidos.push(e);
  }
  return elegidos;
}

/** Un ejercicio con los campos que pide su tipo (y ninguno más), o null si no cumple las reglas. */
function validarUno(
  bruto: Record<string, unknown>,
  modulo: Modulo,
  tipos: TipoEjercicio[],
  uso: UsoEjercicio,
): EjercicioGenerado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const tipo = bruto.tipo as TipoEjercicio;
  if (!tipos.includes(tipo)) return null;

  const enunciado = texto(bruto.enunciado);
  const concepto = modulo.conceptos.find((c) => c.id === bruto.conceptoId);
  const [referencia] = validarFuentes([bruto.fuente], modulo, 1);
  if (!enunciado || !concepto || !referencia) return null;

  const base = { moduloId: modulo.id, conceptoId: concepto.id, tipo, enunciado };
  switch (tipo) {
    case "test": {
      const opciones = Array.isArray(bruto.opciones) ? bruto.opciones.map(texto) : [];
      const solucion = bruto.solucion;
      const opcionesValidas =
        opciones.length >= MINIMO_OPCIONES &&
        opciones.length <= MAXIMO_OPCIONES &&
        opciones.every(Boolean) &&
        new Set(opciones.map(normalizar)).size === opciones.length;
      if (!opcionesValidas || !Number.isInteger(solucion) || (solucion as number) < 0 || (solucion as number) >= opciones.length) {
        return null;
      }
      return { ...base, opciones, solucion: solucion as number, uso, referencia };
    }
    case "respuesta_corta": {
      const solucion = typeof bruto.solucion === "number" && Number.isFinite(bruto.solucion) ? String(bruto.solucion) : texto(bruto.solucion);
      return solucion ? { ...base, solucion, uso, referencia } : null;
    }
    case "abierta":
    case "codigo": {
      const rubrica = texto(bruto.rubrica);
      if (!rubrica) return null;
      // En «codigo», la solución, si la hay, es un código de referencia. En «abierta» se corrige solo con la rúbrica.
      const solucion = tipo === "codigo" ? texto(bruto.solucion) : "";
      return solucion ? { ...base, solucion, rubrica, uso, referencia } : { ...base, rubrica, uso, referencia };
    }
    default:
      return null;
  }
}
