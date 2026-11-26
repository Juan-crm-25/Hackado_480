/**
 * ACTIVIDAD SIMULADA para que el Radar del tutor (#5) tenga algo que enseñar en la demo.
 *
 * Contenido de demo escrito a mano (como el resto de src/lib/demo): no son datos reales de nadie.
 * Es una función pura y determinista: la misma entrada da siempre la misma actividad, así que
 * `npm run db:seed:actividad` se puede repetir y los tests son estables.
 *
 * Patrones que tiene que mostrar el Radar:
 * - La especificidad (CSS) es el concepto que más se falla, en torno al 60 %.
 * - Hay alumnos atascados: 3 fallos seguidos en un concepto en los últimos 3 días.
 * - Hay alumnos inactivos: llevan más de 9 días sin entrar.
 * - Las dudas al tutor se concentran en los conceptos que se fallan. Ya están filtradas (sin datos personales).
 */
import type { TipoEjercicio } from "../types";

/** 20 alumnos inventados que se suman a los 8 inventados del seed (los de la demo en directo no se tocan). */
export const ALUMNOS_SIMULADOS: { nombre: string; email: string }[] = [
  ["Alba Ruiz", "alba"],
  ["Bruno Ortega", "bruno"],
  ["Claudia Vidal", "claudia"],
  ["Daniel Castro", "daniel"],
  ["Eva Molina", "eva"],
  ["Fernando Gil", "fernando"],
  ["Gloria Serrano", "gloria"],
  ["Héctor Blanco", "hector.b"],
  ["Irene Herrera", "irene"],
  ["Jorge Peña", "jorge"],
  ["Lidia Campos", "lidia"],
  ["Mario Vega", "mario"],
  ["Nerea Iglesias", "nerea"],
  ["Óscar Rubio", "oscar"],
  ["Paula Cano", "paula"],
  ["Raúl Prieto", "raul"],
  ["Sara Delgado", "sara"],
  ["Tomás León", "tomas"],
  ["Úrsula Marín", "ursula"],
  ["Víctor Soto", "victor"],
].map(([nombre, usuario]) => ({ nombre, email: `${usuario}@simulado.demo.test` }));

/** Probabilidad base de fallar cada concepto. La especificidad, la que más (es el ejemplo del Radar). */
const TASA_FALLO: Record<string, number> = {
  "html-web": 0.08,
  "html-estructura": 0.12,
  "html-semantica": 0.15,
  "css-especificidad": 0.62,
  "css-caja": 0.15,
  "css-unidades": 0.35,
  "resp-flexbox": 0.3,
  "resp-grid": 0.38,
  "resp-media": 0.2,
  "js-basico": 0.22,
  "js-dom": 0.28,
  "js-eventos": 0.33,
};

/** Dudas típicas por concepto, como quedarían ya filtradas. */
const DUDAS: Record<string, string[]> = {
  "html-web": ["¿Qué diferencia hay entre HTML, CSS y JavaScript?", "¿Qué hace exactamente el navegador con el HTML?"],
  "html-estructura": ["¿Para qué sirve el <head> si no se ve en la página?", "¿Es obligatorio poner el doctype?"],
  "html-semantica": ["¿Cuándo uso <section> y cuándo <article>?", "¿Por qué no puedo usar solo <div> para todo?"],
  "css-especificidad": [
    "No entiendo por qué mi clase no se aplica si está después en el CSS",
    "¿Cómo se calcula la especificidad de div .boton?",
    "¿Un id siempre gana aunque haya muchas clases?",
    "¿Cuándo debería usar !important?",
  ],
  "css-caja": ["¿Por qué mi caja mide más de lo que pongo en width?", "¿Qué diferencia hay entre margin y padding?"],
  "css-unidades": ["¿Cuándo uso rem y cuándo em?", "¿Por qué el texto se hace enorme al anidar elementos con em?", "¿Es malo usar px?"],
  "resp-flexbox": ["¿Cómo centro un elemento con flexbox?", "¿Qué diferencia hay entre justify-content y align-items?"],
  "resp-grid": ["¿Qué significa 1fr?", "¿Cuándo uso grid en vez de flexbox?", "¿Cómo hago que un elemento ocupe dos columnas?"],
  "resp-media": ["¿Por qué mi media query no hace nada?", "¿Qué es mobile-first exactamente?"],
  "js-basico": ["¿Qué diferencia hay entre let y const?", "¿Por qué mi bucle no termina nunca?"],
  "js-dom": [
    "¿Por qué querySelector me devuelve null?",
    "¿Qué diferencia hay entre innerHTML y textContent?",
    "¿Cómo cambio el estilo de un elemento desde JavaScript?",
  ],
  "js-eventos": ["¿Por qué mi addEventListener se ejecuta al cargar la página?", "¿Qué es el objeto event?"],
};

const RESPUESTA_TUTOR = "Respuesta del tutor (actividad simulada para la demo).";

export interface EntradaActividad {
  ahora: Date;
  /** Alumnos INVENTADOS que reciben actividad (nunca los de la demo en directo). */
  alumnos: { usuarioId: string; email: string }[];
  conceptos: { id: string; slug: string; moduloId: string }[];
  /** Solo ejercicios APROBADOS: los intentos se hacen sobre el banco real. */
  ejercicios: {
    id: string;
    conceptoId: string;
    tipo: TipoEjercicio;
    opciones?: string[] | null;
    solucion?: number | string | null;
    claseId: string;
    segundoReferencia: number;
  }[];
}

export interface IntentoSimulado {
  usuarioId: string;
  ejercicioId: string;
  respuesta: number | string;
  puntuacion: number;
  correcto: boolean;
  feedback: string;
  repasarClaseId: string | null;
  repasarSegundo: number | null;
  fecha: Date;
}

export interface ConversacionSimulada {
  usuarioId: string;
  moduloId: string;
  creada: Date;
  mensajes: { rol: "alumno" | "tutor"; texto: string; fecha: Date }[];
}

export interface ProgresoSimulado {
  usuarioId: string;
  moduloId: string;
  estado: "en_curso" | "completado";
  aciertosPorConcepto: Record<string, number>;
  actualizado: Date;
}

export interface ActividadSimulada {
  intentos: IntentoSimulado[];
  conversaciones: ConversacionSimulada[];
  progresos: ProgresoSimulado[];
}

type Perfil = { tipo: "atascado"; concepto: string; modulos: number } | { tipo: "inactivo"; modulos: number } | { tipo: "normal"; modulos: number };

const HORA = 3600 * 1000;
const DIA = 24 * HORA;
const INTENTOS_POR_CONCEPTO = 3;

/** Perfil de cada alumno según su posición: 3 atascados en especificidad, 2 en el DOM, 3 inactivos y el resto normales. */
function perfilDe(posicion: number): Perfil {
  if (posicion < 3) return { tipo: "atascado", concepto: "css-especificidad", modulos: 2 };
  if (posicion < 5) return { tipo: "atascado", concepto: "js-dom", modulos: 4 };
  if (posicion < 8) return { tipo: "inactivo", modulos: 2 };
  return { tipo: "normal", modulos: 1 + (posicion % 4) };
}

/** Generador pseudoaleatorio reproducible (mulberry32) con una semilla sacada del email. */
function aleatorio(semilla: string): () => number {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function construirActividad(entrada: EntradaActividad): ActividadSimulada {
  const ahora = entrada.ahora.getTime();
  const modulos = [...new Set(entrada.conceptos.map((c) => c.moduloId))];
  const alumnos = [...entrada.alumnos].sort((a, b) => a.email.localeCompare(b.email));

  const intentos: IntentoSimulado[] = [];
  const conversaciones: ConversacionSimulada[] = [];
  const progresos: ProgresoSimulado[] = [];

  alumnos.forEach((alumno, posicion) => {
    const perfil = perfilDe(posicion);
    const azar = aleatorio(alumno.email);
    const habilidad = (azar() - 0.5) * 0.16; // cada alumno, un poco mejor o peor que la media

    // Ventana de actividad: los inactivos dejaron de entrar hace más de 9 días.
    const inicio = perfil.tipo === "inactivo" ? ahora - 14 * DIA : ahora - 13 * DIA;
    const fin = perfil.tipo === "inactivo" ? ahora - 10 * DIA : ahora - 4 * DIA;

    const conceptosAlcanzados = entrada.conceptos.filter((c) => modulos.indexOf(c.moduloId) < perfil.modulos);
    const pasos = conceptosAlcanzados.length * INTENTOS_POR_CONCEPTO;
    let paso = 0;
    const siguienteFecha = () => new Date(inicio + ((fin - inicio) * ++paso) / (pasos + 1) - azar() * HORA);

    const suyos: IntentoSimulado[] = [];
    const dudas: { concepto: (typeof entrada.conceptos)[number]; fecha: Date }[] = [];

    for (const concepto of conceptosAlcanzados) {
      const ejercicios = entrada.ejercicios.filter((e) => e.conceptoId === concepto.id);
      if (ejercicios.length === 0) continue;
      const atascado = perfil.tipo === "atascado" && perfil.concepto === concepto.slug;
      const tasa = Math.min(0.95, Math.max(0, (TASA_FALLO[concepto.slug] ?? 0.2) - habilidad));

      const delConcepto: IntentoSimulado[] = [];
      for (let n = 0; n < INTENTOS_POR_CONCEPTO; n++) {
        const ejercicio = ejercicios[n % ejercicios.length];
        delConcepto.push(intento(alumno.usuarioId, ejercicio, azar() >= tasa, siguienteFecha()));
      }
      if (atascado) {
        // Los 3 últimos intentos, fallados y en los últimos 3 días: lo que el Radar llama «atascado».
        for (let n = 0; n < 3; n++) {
          const ejercicio = ejercicios[n % ejercicios.length];
          delConcepto.push(intento(alumno.usuarioId, ejercicio, false, new Date(ahora - (2.5 - n) * DIA)));
        }
      }
      suyos.push(...delConcepto);

      // Pregunta al tutor por lo que falla: una duda por concepto con 2 fallos o más (dos si está atascado).
      const fallos = delConcepto.filter((i) => !i.correcto);
      if (fallos.length >= 2) {
        const veces = atascado ? 2 : 1;
        for (let v = 0; v < veces; v++) dudas.push({ concepto, fecha: new Date(fallos[fallos.length - 1 - v].fecha.getTime() + 10 * 60 * 1000) });
      }
    }

    intentos.push(...suyos);

    // Una conversación por módulo con las dudas de ese módulo, en orden.
    for (const moduloId of modulos) {
      const delModulo = dudas.filter((d) => d.concepto.moduloId === moduloId).sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      if (delModulo.length === 0) continue;
      const mensajes = delModulo.flatMap((d, i) => {
        const opciones = DUDAS[d.concepto.slug] ?? ["No entiendo este concepto"];
        const texto = opciones[Math.floor(azar() * opciones.length) % opciones.length];
        const fecha = new Date(Math.min(d.fecha.getTime(), ahora - 2 * 60 * 1000) + i);
        return [
          { rol: "alumno" as const, texto, fecha },
          { rol: "tutor" as const, texto: RESPUESTA_TUTOR, fecha: new Date(fecha.getTime() + 1000) },
        ];
      });
      conversaciones.push({ usuarioId: alumno.usuarioId, moduloId, creada: mensajes[0].fecha, mensajes });
    }

    // Progreso de cada módulo tocado, calculado con sus intentos.
    for (const moduloId of modulos) {
      const conceptosModulo = entrada.conceptos.filter((c) => c.moduloId === moduloId);
      const aciertosPorConcepto: Record<string, number> = {};
      let ultima = 0;
      for (const c of conceptosModulo) {
        const ids = new Set(entrada.ejercicios.filter((e) => e.conceptoId === c.id).map((e) => e.id));
        const delConcepto = suyos.filter((i) => ids.has(i.ejercicioId));
        if (delConcepto.length === 0) continue;
        aciertosPorConcepto[c.slug] = Math.round((delConcepto.filter((i) => i.correcto).length / delConcepto.length) * 100) / 100;
        ultima = Math.max(ultima, ...delConcepto.map((i) => i.fecha.getTime()));
      }
      if (Object.keys(aciertosPorConcepto).length === 0) continue;
      const completo =
        Object.keys(aciertosPorConcepto).length === conceptosModulo.length && Object.values(aciertosPorConcepto).every((v) => v >= 0.7);
      progresos.push({ usuarioId: alumno.usuarioId, moduloId, estado: completo ? "completado" : "en_curso", aciertosPorConcepto, actualizado: new Date(ultima) });
    }
  });

  return { intentos, conversaciones, progresos };
}

function intento(usuarioId: string, ejercicio: EntradaActividad["ejercicios"][number], correcto: boolean, fecha: Date): IntentoSimulado {
  return {
    usuarioId,
    ejercicioId: ejercicio.id,
    respuesta: respuestaSimulada(ejercicio, correcto),
    puntuacion: correcto ? 1 : 0,
    correcto,
    feedback: correcto ? "¡Correcto!" : "No es correcto. Repasa este momento del vídeo.",
    repasarClaseId: correcto ? null : ejercicio.claseId,
    repasarSegundo: correcto ? null : ejercicio.segundoReferencia,
    fecha,
  };
}

function respuestaSimulada(ejercicio: EntradaActividad["ejercicios"][number], correcto: boolean): number | string {
  if (ejercicio.tipo === "test" && typeof ejercicio.solucion === "number") {
    const total = ejercicio.opciones?.length ?? 2;
    return correcto ? ejercicio.solucion : (ejercicio.solucion + 1) % Math.max(total, 2);
  }
  if (correcto && ejercicio.solucion !== undefined && ejercicio.solucion !== null) return ejercicio.solucion;
  return correcto ? "Respuesta correcta (simulada)" : "Respuesta incorrecta (simulada)";
}
