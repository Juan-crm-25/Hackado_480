/**
 * Generador de material común (issues #2 y #15). Instrucciones en agents/material.md.
 * Se ejecuta una vez POR VÍDEO desde scripts/generar-material.ts (nunca por petición de un alumno) y se guarda
 * en la tabla material_clase, sin revisar.
 */
import { completar as completarIA } from "../ai/cliente";
import { getConfigIA } from "../ai/config";
import { contenidoDelCurso } from "../ai/privacidad";
import { temarioDelModulo } from "./temario";
import type { Modulo, SeccionResumen, Tarjeta, Video } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { parsearObjetoJson, validarFuentes } from "./validacion";

export const MINIMO_SECCIONES = 2;
export const MINIMO_TARJETAS = 4;
// Por vídeo (unos 5 minutos): el módulo, con sus 3 vídeos, se queda en unos 6-9 apartados y 12-18 tarjetas.
export const MAXIMO_SECCIONES = 3;
export const MAXIMO_TARJETAS = 6;

export interface DependenciasMaterial {
  completar: typeof completarIA;
  /** El temario del módulo; el real lo lee de la BBDD (`documento`, #39). */
  temario: (modulo: Modulo) => string | Promise<string>;
}

const dependenciasReales: DependenciasMaterial = { completar: completarIA, temario: (m) => temarioDelModulo(m) };

/** Lo que se genera para un vídeo, listo para guardar. */
export interface MaterialDeVideo {
  resumen: SeccionResumen[];
  tarjetas: Tarjeta[];
  /** Modelo que lo generó, para trazabilidad. */
  modelo: string;
}

/**
 * El módulo reducido a uno de sus vídeos: el temario solo lleva esa transcripción y las validaciones descartan
 * las fuentes que apunten a otro vídeo. Falla si el vídeo no es del módulo.
 */
export function moduloConSoloElVideo(modulo: Modulo, video: Video): Modulo {
  if (!modulo.videos.some((v) => v.id === video.id)) throw new Error(`El vídeo "${video.id}" no es del módulo «${modulo.titulo}».`);
  return { ...modulo, videos: [video] };
}

export async function generarMaterialDeVideo(
  modulo: Modulo,
  video: Video,
  deps: DependenciasMaterial = dependenciasReales,
): Promise<MaterialDeVideo> {
  const soloVideo = moduloConSoloElVideo(modulo, video);
  const temario = await deps.temario(soloVideo);
  if (!temario) throw new Error(`El vídeo «${video.titulo}» no tiene transcripción: no hay de dónde generar material.`);

  const sistema = rellenar(leerInstrucciones("material"), {
    modulo: modulo.titulo,
    video: video.titulo,
    conceptos: modulo.conceptos.map((c) => c.nombre).join(", "),
    temario,
  });

  const r = await deps.completar({
    modelo: "generador",
    formatoJson: true,
    maxTokens: 2000,
    temperatura: 0.3,
    mensajes: [
      { rol: "sistema", contenido: contenidoDelCurso(sistema) },
      { rol: "usuario", contenido: contenidoDelCurso("Genera el resumen y las tarjetas del vídeo.") },
    ],
  });
  if (r.simulado) throw new Error("La IA está en modo simulado: configura AI_BASE_URL y AI_API_KEY en .env.local.");

  const { resumen, tarjetas } = validarMaterial(r.texto, soloVideo);
  return { resumen, tarjetas, modelo: getConfigIA().modelos.generador };
}

/** Valida y limpia lo que devuelve el modelo. Lanza un error si no hay material suficiente. */
export function validarMaterial(texto: string, modulo: Modulo): { resumen: SeccionResumen[]; tarjetas: Tarjeta[] } {
  const datos = parsearObjetoJson(texto);
  if (!datos) throw new Error("El modelo no devolvió JSON válido.");

  const resumen = validarSecciones(datos.resumen, modulo, MAXIMO_SECCIONES);
  const tarjetas = validarTarjetas(datos.tarjetas, modulo, MAXIMO_TARJETAS);

  if (resumen.length < MINIMO_SECCIONES || tarjetas.length < MINIMO_TARJETAS) {
    throw new Error(
      `Material insuficiente: ${resumen.length} apartados (mínimo ${MINIMO_SECCIONES}) y ${tarjetas.length} tarjetas (mínimo ${MINIMO_TARJETAS}).`,
    );
  }
  return { resumen, tarjetas };
}

const textoLimpio = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const lista = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

/** Apartados con título y texto, sin repetidos, con su fuente validada. */
export function validarSecciones(valor: unknown, modulo: Modulo, maximo: number): SeccionResumen[] {
  const resumen: SeccionResumen[] = [];
  for (const s of lista(valor)) {
    const titulo = textoLimpio(s?.titulo);
    const cuerpo = textoLimpio(s?.texto);
    if (!titulo || !cuerpo || resumen.some((x) => x.titulo === titulo)) continue;
    resumen.push({ titulo, texto: cuerpo, fuente: validarFuentes([s?.fuente], modulo, 1)[0] });
    if (resumen.length === maximo) break;
  }
  return resumen;
}

/** Tarjetas con pregunta y respuesta, sin repetidas, con su fuente validada. */
export function validarTarjetas(valor: unknown, modulo: Modulo, maximo: number): Tarjeta[] {
  const tarjetas: Tarjeta[] = [];
  for (const t of lista(valor)) {
    const pregunta = textoLimpio(t?.pregunta);
    const respuesta = textoLimpio(t?.respuesta);
    if (!pregunta || !respuesta || tarjetas.some((x) => x.pregunta === pregunta)) continue;
    tarjetas.push({ pregunta, respuesta, fuente: validarFuentes([t?.fuente], modulo, 1)[0] });
    if (tarjetas.length === maximo) break;
  }
  return tarjetas;
}
