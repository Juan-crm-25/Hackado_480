import "server-only";
import type { AlertaAlumno, ConceptoFallado, DudasModulo, InformeRadar } from "@/lib/types";

/**
 * Cálculo del Radar del tutor (#5): SOLO código, sin IA, para que sea predecible y explicable.
 * Recibe los datos ya leídos de la BBDD (repositorio.ts) y devuelve el informe para el profesor.
 *
 * Reglas:
 * - Atascado: 3 fallos seguidos o más en un mismo concepto, y el último en los últimos 7 días.
 * - Inactivo: había empezado, pero no ha hecho nada (intentos ni dudas al tutor) en más de 7 días.
 * - Conceptos más fallados: % de fallo de los últimos 30 días, con al menos 5 intentos (los 5 peores).
 * - Dudas frecuentes: preguntas al tutor de las últimas 2 semanas, por módulo (las 3 que más se repiten).
 */

const DIA = 24 * 3600 * 1000;
export const FALLOS_SEGUIDOS = 3;
export const DIAS_ATASCADO = 7;
export const DIAS_INACTIVO = 7;
const DIAS_CONCEPTOS = 30;
const MINIMO_INTENTOS = 5;
const MAXIMO_CONCEPTOS = 5;
const DIAS_DUDAS = 14;
const MAXIMO_DUDAS = 3;

export interface DatosRadar {
  curso: { slug: string; titulo: string };
  modulos: { slug: string; titulo: string }[];
  /** Alumnos matriculados en el curso (los profesores no). */
  alumnos: { usuarioId: string; nombre: string }[];
  intentos: { usuarioId: string; conceptoSlug: string; concepto: string; moduloSlug: string; correcto: boolean; fecha: Date }[];
  /** Preguntas de los alumnos al tutor IA (texto ya filtrado). */
  dudas: { usuarioId: string; moduloSlug: string; texto: string; fecha: Date }[];
}

export function calcularRadar(datos: DatosRadar, ahora: Date): InformeRadar {
  const nombres = new Map(datos.alumnos.map((a) => [a.usuarioId, a.nombre]));
  const deAlumnos = datos.intentos.filter((i) => nombres.has(i.usuarioId));
  const dudas = datos.dudas.filter((d) => nombres.has(d.usuarioId));

  return {
    curso: datos.curso,
    generado: ahora.toISOString(),
    alumnos: datos.alumnos.length,
    modulos: datos.modulos.map((m) => ({ id: m.slug, titulo: m.titulo })),
    alertas: [...atascados(deAlumnos, nombres, ahora), ...inactivos(deAlumnos, dudas, nombres, ahora)],
    conceptosMasFallados: conceptosMasFallados(deAlumnos, ahora),
    dudasFrecuentes: dudasFrecuentes(dudas, datos.modulos, ahora),
  };
}

function atascados(intentos: DatosRadar["intentos"], nombres: Map<string, string>, ahora: Date): AlertaAlumno[] {
  const grupos = agrupar(intentos, (i) => `${i.usuarioId}|${i.conceptoSlug}`);
  const alertas: AlertaAlumno[] = [];
  for (const lista of grupos.values()) {
    const ordenados = [...lista].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    let seguidos = 0;
    for (let i = ordenados.length - 1; i >= 0 && !ordenados[i].correcto; i--) seguidos++;
    const ultimo = ordenados[ordenados.length - 1];
    if (seguidos < FALLOS_SEGUIDOS || ahora.getTime() - ultimo.fecha.getTime() > DIAS_ATASCADO * DIA) continue;
    alertas.push({
      alumnoId: ultimo.usuarioId,
      nombre: nombres.get(ultimo.usuarioId)!,
      motivo: "fallos_repetidos",
      moduloId: ultimo.moduloSlug,
      conceptoId: ultimo.conceptoSlug,
      detalle: `${seguidos} fallos seguidos en «${ultimo.concepto}»`,
      fecha: ultimo.fecha.toISOString(),
    });
  }
  // El más reciente primero: es el que más urge.
  return alertas.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function inactivos(
  intentos: DatosRadar["intentos"],
  dudas: DatosRadar["dudas"],
  nombres: Map<string, string>,
  ahora: Date,
): AlertaAlumno[] {
  const ultima = new Map<string, { fecha: Date; moduloSlug: string }>();
  const anotar = (usuarioId: string, fecha: Date, moduloSlug: string) => {
    const actual = ultima.get(usuarioId);
    if (!actual || fecha > actual.fecha) ultima.set(usuarioId, { fecha, moduloSlug });
  };
  for (const i of intentos) anotar(i.usuarioId, i.fecha, i.moduloSlug);
  for (const d of dudas) anotar(d.usuarioId, d.fecha, d.moduloSlug);

  const alertas: AlertaAlumno[] = [];
  for (const [usuarioId, { fecha, moduloSlug }] of ultima) {
    const dias = Math.floor((ahora.getTime() - fecha.getTime()) / DIA);
    if (dias <= DIAS_INACTIVO) continue;
    alertas.push({
      alumnoId: usuarioId,
      nombre: nombres.get(usuarioId)!,
      motivo: "inactividad",
      moduloId: moduloSlug,
      detalle: `Sin actividad desde hace ${dias} días`,
      fecha: fecha.toISOString(),
    });
  }
  // El que más tiempo lleva sin entrar, primero.
  return alertas.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function conceptosMasFallados(intentos: DatosRadar["intentos"], ahora: Date): ConceptoFallado[] {
  const recientes = intentos.filter((i) => ahora.getTime() - i.fecha.getTime() <= DIAS_CONCEPTOS * DIA);
  return [...agrupar(recientes, (i) => i.conceptoSlug).values()]
    .filter((lista) => lista.length >= MINIMO_INTENTOS)
    .map((lista) => ({
      moduloId: lista[0].moduloSlug,
      conceptoId: lista[0].conceptoSlug,
      concepto: lista[0].concepto,
      porcentajeFallo: Math.round((lista.filter((i) => !i.correcto).length / lista.length) * 100) / 100,
      intentos: lista.length,
    }))
    .filter((c) => c.porcentajeFallo > 0)
    .sort((a, b) => b.porcentajeFallo - a.porcentajeFallo)
    .slice(0, MAXIMO_CONCEPTOS);
}

function dudasFrecuentes(dudas: DatosRadar["dudas"], modulos: DatosRadar["modulos"], ahora: Date): DudasModulo[] {
  return agruparDudas(dudas, modulos, ahora).map((d) => ({ ...d, masRepetidas: d.masRepetidas.slice(0, MAXIMO_DUDAS) }));
}

/**
 * Dudas de las 2 últimas semanas por módulo (el que más tiene, primero), con cada pregunta distinta
 * y cuántas veces se ha hecho (de más a menos). La misma pregunta con otras mayúsculas o espacios cuenta como una.
 */
export function agruparDudas(dudas: DatosRadar["dudas"], modulos: DatosRadar["modulos"], ahora: Date): DudasModulo[] {
  const recientes = dudas.filter((d) => ahora.getTime() - d.fecha.getTime() <= DIAS_DUDAS * DIA);
  const titulos = new Map(modulos.map((m) => [m.slug, m.titulo]));
  return [...agrupar(recientes, (d) => d.moduloSlug)]
    .map(([moduloSlug, lista]) => {
      // La misma pregunta con otras mayúsculas o espacios cuenta como la misma.
      const porTexto = new Map<string, { texto: string; veces: number }>();
      for (const d of lista) {
        const clave = d.texto.trim().replace(/\s+/g, " ").toLowerCase();
        const actual = porTexto.get(clave) ?? { texto: d.texto.trim(), veces: 0 };
        actual.veces++;
        porTexto.set(clave, actual);
      }
      return {
        moduloId: moduloSlug,
        modulo: titulos.get(moduloSlug) ?? moduloSlug,
        total: lista.length,
        masRepetidas: [...porTexto.values()].sort((a, b) => b.veces - a.veces),
      };
    })
    .sort((a, b) => b.total - a.total);
}

function agrupar<T>(lista: T[], clave: (x: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const x of lista) grupos.set(clave(x), [...(grupos.get(clave(x)) ?? []), x]);
  return grupos;
}
