/**
 * Generador de infografías (#7). Instrucciones en agents/infografia.md.
 * La IA elige una plantilla y rellena sus datos; aquí se valida todo antes de guardarlo.
 */
import { completar as completarIA } from "../ai/cliente";
import { contenidoDelCurso } from "../ai/privacidad";
import { temarioDelModulo } from "../transcripciones";
import type { Concepto, ElementoInfografia, Infografia, Modulo, PlantillaLista } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { parsearObjetoJson, validarFuentes } from "./validacion";

const PLANTILLAS_LISTA: PlantillaLista[] = ["capas", "jerarquia", "pasos"];
const MIN = 2;
const MAX = 6;
const MAX_NOMBRE = 40;
const MAX_TEXTO = 140;

export interface DependenciasInfografia {
  completar: typeof completarIA;
  temario: (modulo: Modulo) => string;
}

const dependenciasReales: DependenciasInfografia = { completar: completarIA, temario: (m) => temarioDelModulo(m) };

export async function generarInfografia(
  modulo: Modulo,
  concepto: Concepto,
  deps: DependenciasInfografia = dependenciasReales,
): Promise<Infografia> {
  const temario = deps.temario(modulo);
  if (!temario) throw new Error(`El módulo «${modulo.titulo}» no tiene transcripciones.`);

  const sistema = rellenar(leerInstrucciones("infografia"), { modulo: modulo.titulo, concepto: concepto.nombre, temario });
  const r = await deps.completar({
    modelo: "generador",
    formatoJson: true,
    maxTokens: 800,
    temperatura: 0.2,
    mensajes: [
      { rol: "sistema", contenido: contenidoDelCurso(sistema) },
      { rol: "usuario", contenido: contenidoDelCurso(`Prepara la infografía de «${concepto.nombre}».`) },
    ],
  });
  if (r.simulado) throw new Error("La IA está en modo simulado: configura AI_BASE_URL y AI_API_KEY en .env.local.");

  return validarInfografia(r.texto, modulo, concepto.id);
}

const corto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Valida lo que devuelve el modelo. Lanza un error si no encaja en ninguna plantilla. */
export function validarInfografia(texto: string, modulo: Modulo, conceptoId: string): Infografia {
  const datos = parsearObjetoJson(texto);
  if (!datos) throw new Error("El modelo no devolvió JSON válido.");

  const titulo = corto(datos.titulo, 60);
  if (!titulo) throw new Error("La infografía no tiene título.");
  const fuente = validarFuentes([datos.fuente], modulo, 1)[0];
  const base = { conceptoId, titulo, ...(fuente ? { fuente } : {}) };

  if (datos.plantilla === "comparativa") {
    const columnas = (Array.isArray(datos.columnas) ? datos.columnas : []).map((c) => corto(c, MAX_NOMBRE)).filter(Boolean).slice(0, 3);
    if (columnas.length < 1) throw new Error("La comparativa no tiene columnas.");
    const filas: { nombre: string; valores: string[] }[] = [];
    for (const f of Array.isArray(datos.filas) ? (datos.filas as Record<string, unknown>[]) : []) {
      const nombre = corto(f?.nombre, MAX_NOMBRE);
      const valores = Array.isArray(f?.valores) ? (f.valores as unknown[]).map((v) => corto(v, MAX_TEXTO)) : [];
      if (!nombre || valores.length !== columnas.length || valores.some((v) => !v)) continue;
      if (filas.some((x) => x.nombre === nombre)) continue;
      filas.push({ nombre, valores });
      if (filas.length === MAX) break;
    }
    if (filas.length < MIN) throw new Error(`La comparativa necesita al menos ${MIN} filas completas.`);
    return { ...base, plantilla: "comparativa", columnas, filas };
  }

  if (!PLANTILLAS_LISTA.includes(datos.plantilla as PlantillaLista)) {
    throw new Error(`Plantilla desconocida: ${String(datos.plantilla)}`);
  }
  const elementos: ElementoInfografia[] = [];
  for (const e of Array.isArray(datos.elementos) ? (datos.elementos as Record<string, unknown>[]) : []) {
    const nombre = corto(e?.nombre, MAX_NOMBRE);
    const descripcion = corto(e?.descripcion, MAX_TEXTO);
    if (!nombre || !descripcion || elementos.some((x) => x.nombre === nombre)) continue;
    elementos.push({ nombre, descripcion });
    if (elementos.length === MAX) break;
  }
  if (elementos.length < MIN) throw new Error(`La infografía necesita al menos ${MIN} elementos.`);
  return { ...base, plantilla: datos.plantilla as PlantillaLista, elementos };
}
