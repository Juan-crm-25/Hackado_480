/**
 * Generador de ejercicios de verificación (issue #4). Instrucciones en agents/generador-ejercicios.md.
 * Se ejecuta una vez por módulo desde un script, nunca por petición de un alumno.
 * La IA solo devuelve JSON: este fichero lo valida y el código que llama lo guarda como borrador.
 */
import type { Ejercicio, Modulo, PlantillaEjercicios, TipoEjercicio } from "../types";
import { parsearObjetoJson, validarFuentes } from "./validacion";

/** Ejercicios que se piden por concepto: 3 conceptos por módulo dan un banco de 9. */
export const EJERCICIOS_POR_CONCEPTO = 3;
/** Si quedan menos ejercicios válidos, no se guarda nada. */
export const MINIMO_EJERCICIOS = 6;
/** Opciones de un ejercicio tipo test. */
const MINIMO_OPCIONES = 2;
const MAXIMO_OPCIONES = 5;

/** Ejercicio ya validado, antes de guardarlo: aún sin id y sin estado (se guarda como borrador). */
export type EjercicioGenerado = Omit<Ejercicio, "id" | "estado">;

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** Para detectar enunciados repetidos: minúsculas y sin espacios de más. */
const normalizar = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Valida y limpia lo que devuelve el modelo: `{ "ejercicios": [...] }`. Descarta cada ejercicio que no cumple
 * las reglas de su tipo o que cita un concepto o un vídeo que no es del módulo, quita repetidos y se queda con
 * EJERCICIOS_POR_CONCEPTO por concepto. Lanza un error si quedan menos de MINIMO_EJERCICIOS o si algún concepto
 * se queda sin ejercicios: en ese caso no se guarda nada.
 */
export function validarEjercicios(respuesta: string, modulo: Modulo, plantilla: PlantillaEjercicios): EjercicioGenerado[] {
  const datos = parsearObjetoJson(respuesta);
  if (!datos) throw new Error("El modelo no devolvió JSON válido.");
  const lista = Array.isArray(datos.ejercicios) ? (datos.ejercicios as Record<string, unknown>[]) : [];

  const ejercicios: EjercicioGenerado[] = [];
  const vistos = new Set<string>();
  for (const bruto of lista) {
    const ejercicio = validarUno(bruto, modulo, plantilla);
    if (!ejercicio) continue;
    const clave = normalizar(ejercicio.enunciado);
    if (vistos.has(clave)) continue;
    if (ejercicios.filter((e) => e.conceptoId === ejercicio.conceptoId).length === EJERCICIOS_POR_CONCEPTO) continue;
    vistos.add(clave);
    ejercicios.push(ejercicio);
  }

  if (ejercicios.length < MINIMO_EJERCICIOS) {
    throw new Error(`Ejercicios insuficientes: ${ejercicios.length} válidos (mínimo ${MINIMO_EJERCICIOS}).`);
  }
  const sinEjercicios = modulo.conceptos.filter((c) => !ejercicios.some((e) => e.conceptoId === c.id));
  if (sinEjercicios.length > 0) {
    throw new Error(`Conceptos sin ningún ejercicio válido: ${sinEjercicios.map((c) => c.nombre).join(", ")}.`);
  }
  return ejercicios;
}

/** Un ejercicio con los campos que pide su tipo (y ninguno más), o null si no cumple las reglas. */
function validarUno(bruto: Record<string, unknown>, modulo: Modulo, plantilla: PlantillaEjercicios): EjercicioGenerado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const tipo = bruto.tipo as TipoEjercicio;
  if (!plantilla.tipos.includes(tipo)) return null;

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
      return { ...base, opciones, solucion: solucion as number, referencia };
    }
    case "respuesta_corta": {
      const solucion = typeof bruto.solucion === "number" && Number.isFinite(bruto.solucion) ? String(bruto.solucion) : texto(bruto.solucion);
      return solucion ? { ...base, solucion, referencia } : null;
    }
    case "abierta":
    case "codigo": {
      const rubrica = texto(bruto.rubrica);
      if (!rubrica) return null;
      // En «codigo», la solución, si la hay, es un código de referencia. En «abierta» se corrige solo con la rúbrica.
      const solucion = tipo === "codigo" ? texto(bruto.solucion) : "";
      return solucion ? { ...base, solucion, rubrica, referencia } : { ...base, rubrica, referencia };
    }
    default:
      return null;
  }
}
