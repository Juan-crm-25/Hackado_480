/**
 * Tipos compartidos: el CONTRATO del proyecto.
 *
 * Todos los bloques (IA, contenido, datos y frontend) trabajan contra estos tipos.
 * Cambiarlos afecta a todo el equipo: avisa por WhatsApp antes de fusionar (ver CONTRIBUTING.md).
 * Ver también docs/api.md y SPEC.md (apartado 6).
 */

// ─── Catálogo (data/catalog.json) ────────────────────────────────────────────

export interface Catalogo {
  curso: Curso;
}

export interface Curso {
  id: string;
  titulo: string;
  descripcion: string;
  modulos: Modulo[];
}

export interface Modulo {
  id: string; // p. ej. "m1-html"
  titulo: string;
  descripcion: string;
  /** Posición en la ruta sugerida por defecto. No obliga a seguir un orden. */
  ordenSugerido: number;
  /** Conceptos que se evalúan en el módulo. Los ejercicios y el Radar se agrupan por concepto. */
  conceptos: Concepto[];
  videos: Video[];
}

export interface Concepto {
  id: string; // p. ej. "css-especificidad"
  nombre: string;
}

export interface Video {
  id: string; // p. ej. "v04"
  titulo: string;
  /** ID del vídeo de YouTube (lo que va después de "v=" en la URL). */
  youtubeId: string;
  duracionSegundos: number;
  /** Ruta al fichero VTT con marcas de tiempo, relativa a data/transcripciones/. */
  transcripcion?: string;
}

/** Referencia a un momento concreto de un vídeo, para citar fuentes y para el feedback. */
export interface ReferenciaVideo {
  videoId: string;
  segundo: number;
}

// ─── Ejercicios ──────────────────────────────────────────────────────────────

export type TipoEjercicio = "test" | "respuesta_corta" | "abierta" | "codigo";

/** Lo que define el profesor para cada módulo (data/ejemplos-profesor/). */
export interface PlantillaEjercicios {
  moduloId: string;
  tipos: TipoEjercicio[];
  ejemplos: EjercicioBase[];
  /** Instrucciones extra del profesor para el generador (nivel, estilo...). */
  indicaciones?: string;
}

export interface EjercicioBase {
  tipo: TipoEjercicio;
  enunciado: string;
  /** Solo para tipo "test". */
  opciones?: string[];
  /** Índice de la opción correcta (test) o respuesta esperada (respuesta_corta). */
  solucion?: number | string;
  /** Criterios de corrección para "abierta" y "codigo". */
  rubrica?: string;
}

export type EstadoEjercicio = "borrador" | "aprobado";

/** Ejercicio del banco, generado por la IA a partir de la plantilla del profesor. */
export interface Ejercicio extends EjercicioBase {
  id: string;
  moduloId: string;
  conceptoId: string;
  referencia: ReferenciaVideo;
  estado: EstadoEjercicio;
}

/** Versión que se envía al alumno: sin solución ni rúbrica. */
export type EjercicioPublico = Omit<Ejercicio, "solucion" | "rubrica" | "estado">;

// ─── Alumno, intentos y progreso ─────────────────────────────────────────────

/** Datos personales: NUNCA salen hacia la IA (los filtra la capa de privacidad, issue #9). */
export interface Alumno {
  id: string;
  nombre: string;
  email: string;
  esMenor: boolean;
  consentimientoTutorLegal: boolean;
}

export interface Intento {
  id: string;
  alumnoId: string;
  ejercicioId: string;
  respuesta: string | number;
  /** De 0 a 1. */
  puntuacion: number;
  correcto: boolean;
  feedback: string;
  /** Momento del vídeo que se recomienda repasar si ha fallado. */
  repasar?: ReferenciaVideo;
  /** Si la IA no está segura de la corrección, se marca para que la revise un tutor. */
  revisionHumana?: boolean;
  fecha: string; // ISO 8601
}

export type EstadoModulo = "pendiente" | "en_curso" | "dominado" | "completado";

export interface Progreso {
  alumnoId: string;
  moduloId: string;
  estado: EstadoModulo;
  /** Aciertos por concepto, de 0 a 1. */
  aciertosPorConcepto: Record<string, number>;
  actualizado: string; // ISO 8601
}

// ─── Tutor del módulo ────────────────────────────────────────────────────────

export type RolMensaje = "alumno" | "tutor";

export interface Mensaje {
  rol: RolMensaje;
  texto: string;
  /** Fuentes que cita el tutor. */
  fuentes?: ReferenciaVideo[];
}

export type TipoMaterial = "resumen" | "tarjetas" | "infografia";

export interface Tarjeta {
  pregunta: string;
  respuesta: string;
}

/** Material generado una vez por módulo y compartido entre alumnos (caché). */
export type MaterialGenerado =
  | { tipo: "resumen"; moduloId: string; texto: string }
  | { tipo: "tarjetas"; moduloId: string; tarjetas: Tarjeta[] }
  | { tipo: "infografia"; moduloId: string; conceptoId: string; mermaid: string };

// ─── Radar del tutor ─────────────────────────────────────────────────────────

export interface AlertaAlumno {
  alumnoId: string;
  nombre: string; // se reidentifica en nuestro servidor; la IA solo ve seudónimos
  motivo: "fallos_repetidos" | "inactividad";
  moduloId: string;
  conceptoId?: string;
  detalle: string;
}

export interface ConceptoFallado {
  moduloId: string;
  conceptoId: string;
  porcentajeFallo: number; // de 0 a 1
}

export interface InformeRadar {
  generado: string; // ISO 8601
  alertas: AlertaAlumno[];
  conceptosMasFallados: ConceptoFallado[];
  /** Resumen de dudas frecuentes, escrito por el agente analista. */
  resumenDudas: string;
}

// ─── API: peticiones y respuestas ────────────────────────────────────────────

export interface PeticionTutor {
  alumnoId: string;
  moduloId: string;
  mensaje: string;
  historial?: Mensaje[];
}

export interface RespuestaTutor {
  mensaje: Mensaje;
  /** true si la pregunta no se puede responder con el temario del módulo. */
  fueraDeTemario?: boolean;
  /** Consultas que le quedan hoy al alumno. */
  consultasRestantes?: number;
}

export interface PeticionIntento {
  alumnoId: string;
  ejercicioId: string;
  respuesta: string | number;
}

export interface ErrorApi {
  error: string;
}
