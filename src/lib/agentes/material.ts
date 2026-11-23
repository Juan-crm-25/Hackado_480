/**
 * Generador de material común del módulo (issue #2). Instrucciones en agents/material.md.
 * Se ejecuta una vez por módulo desde scripts/generar-material.ts, nunca por petición de un alumno.
 */
import { completar as completarIA } from "../ai/cliente";
import { getConfigIA } from "../ai/config";
import { contenidoDelCurso } from "../ai/privacidad";
import { temarioDelModulo } from "../transcripciones";
import type { MaterialComun, Modulo, SeccionResumen, Tarjeta } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { parsearObjetoJson, validarFuentes } from "./validacion";

export const MINIMO_SECCIONES = 2;
export const MINIMO_TARJETAS = 4;
const MAXIMO_SECCIONES = 6;
const MAXIMO_TARJETAS = 12;

export interface DependenciasMaterial {
  completar: typeof completarIA;
  temario: (modulo: Modulo) => string;
}

const dependenciasReales: DependenciasMaterial = { completar: completarIA, temario: (m) => temarioDelModulo(m) };

export async function generarMaterialComun(
  modulo: Modulo,
  deps: DependenciasMaterial = dependenciasReales,
): Promise<MaterialComun> {
  const temario = deps.temario(modulo);
  if (!temario) throw new Error(`El módulo «${modulo.titulo}» no tiene transcripciones: no hay de dónde generar material.`);

  const sistema = rellenar(leerInstrucciones("material"), {
    modulo: modulo.titulo,
    conceptos: modulo.conceptos.map((c) => c.nombre).join(", "),
    temario,
  });

  const r = await deps.completar({
    modelo: "generador",
    formatoJson: true,
    maxTokens: 3000,
    temperatura: 0.3,
    mensajes: [
      { rol: "sistema", contenido: contenidoDelCurso(sistema) },
      { rol: "usuario", contenido: contenidoDelCurso("Genera el resumen y las tarjetas del módulo.") },
    ],
  });
  if (r.simulado) throw new Error("La IA está en modo simulado: configura AI_BASE_URL y AI_API_KEY en .env.local.");

  const { resumen, tarjetas } = validarMaterial(r.texto, modulo);
  return {
    moduloId: modulo.id,
    generado: new Date().toISOString(),
    modelo: getConfigIA().modelos.generador,
    revisado: false,
    resumen,
    tarjetas,
  };
}

/** Valida y limpia lo que devuelve el modelo. Lanza un error si no hay material suficiente. */
export function validarMaterial(texto: string, modulo: Modulo): { resumen: SeccionResumen[]; tarjetas: Tarjeta[] } {
  const datos = parsearObjetoJson(texto);
  if (!datos) throw new Error("El modelo no devolvió JSON válido.");

  const textoLimpio = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const primeraFuente = (v: unknown) => validarFuentes([v], modulo, 1)[0];

  const resumen: SeccionResumen[] = [];
  for (const s of Array.isArray(datos.resumen) ? (datos.resumen as Record<string, unknown>[]) : []) {
    const titulo = textoLimpio(s?.titulo);
    const cuerpo = textoLimpio(s?.texto);
    if (!titulo || !cuerpo || resumen.some((x) => x.titulo === titulo)) continue;
    resumen.push({ titulo, texto: cuerpo, fuente: primeraFuente(s?.fuente) });
    if (resumen.length === MAXIMO_SECCIONES) break;
  }

  const tarjetas: Tarjeta[] = [];
  for (const t of Array.isArray(datos.tarjetas) ? (datos.tarjetas as Record<string, unknown>[]) : []) {
    const pregunta = textoLimpio(t?.pregunta);
    const respuesta = textoLimpio(t?.respuesta);
    if (!pregunta || !respuesta || tarjetas.some((x) => x.pregunta === pregunta)) continue;
    tarjetas.push({ pregunta, respuesta, fuente: primeraFuente(t?.fuente) });
    if (tarjetas.length === MAXIMO_TARJETAS) break;
  }

  if (resumen.length < MINIMO_SECCIONES || tarjetas.length < MINIMO_TARJETAS) {
    throw new Error(
      `Material insuficiente: ${resumen.length} apartados (mínimo ${MINIMO_SECCIONES}) y ${tarjetas.length} tarjetas (mínimo ${MINIMO_TARJETAS}).`,
    );
  }
  return { resumen, tarjetas };
}
