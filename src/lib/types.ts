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
  /** Momento del vídeo donde se explica, para repasarlo. */
  fuente?: ReferenciaVideo;
}

/** Un apartado del resumen: corto, para leerlo en una pantalla de móvil. */
export interface SeccionResumen {
  titulo: string;
  texto: string;
  fuente?: ReferenciaVideo;
}

/**
 * Material COMÚN del módulo (#2): se genera una vez con `npm run generar:material`,
 * lo revisa el equipo o el profesor y lo comparten todos los alumnos. Vive en data/material/<moduloId>.json.
 */
export interface MaterialComun {
  moduloId: string;
  /** Fecha de generación (ISO 8601). */
  generado: string;
  /** Modelo que lo generó, para trazabilidad. */
  modelo: string;
  /** false hasta que una persona lo revisa y cambia el valor a true en el fichero. */
  revisado: boolean;
  resumen: SeccionResumen[];
  tarjetas: Tarjeta[];
}

export type NivelMaterial = "basico" | "normal" | "avanzado";

/** Lo que pide el alumno para crearse su propio material (#2). */
export interface PeticionMaterialPersonal {
  alumnoId: string;
  moduloId: string;
  tipo: "resumen" | "tarjetas";
  /** Concepto concreto; si falta, todo el módulo. */
  conceptoId?: string;
  nivel?: NivelMaterial;
  /** Indicación libre del alumno ("con más ejemplos"...). Máximo 200 caracteres; se filtra antes de la IA. */
  enfoque?: string;
}

/**
 * Material PERSONAL: lo genera la IA a petición de un alumno y solo lo ve él.
 * No se revisa: se muestra como "Generado por IA".
 */
export interface MaterialPersonal {
  id: string;
  alumnoId: string;
  moduloId: string;
  tipo: "resumen" | "tarjetas";
  conceptoId?: string;
  nivel: NivelMaterial;
  enfoque?: string;
  generado: string; // ISO 8601
  resumen?: SeccionResumen[];
  tarjetas?: Tarjeta[];
}

export interface RespuestaMaterialPersonal {
  material: MaterialPersonal;
  consultasRestantes: number;
}

// ─── Infografías (#7) ────────────────────────────────────────────────────────
// La IA no dibuja: elige una PLANTILLA y rellena sus datos. Las dibujamos nosotros (ligero y nunca sale roto).

/** capas: una dentro de otra (de FUERA a DENTRO) · jerarquia: de más a menos (quién gana) · pasos: en orden. */
export type PlantillaLista = "capas" | "jerarquia" | "pasos";

export interface ElementoInfografia {
  nombre: string;
  descripcion: string;
}

interface InfografiaBase {
  conceptoId: string;
  titulo: string;
  fuente?: ReferenciaVideo;
}

export type Infografia =
  | (InfografiaBase & { plantilla: PlantillaLista; elementos: ElementoInfografia[] })
  | (InfografiaBase & {
      plantilla: "comparativa";
      /** Qué se compara de cada fila (p. ej. ["Relativa a", "Cuándo usarla"]). */
      columnas: string[];
      filas: { nombre: string; valores: string[] }[];
    });

/** Infografías comunes de un módulo: una por concepto. Vive en data/infografias/<moduloId>.json. */
export interface InfografiasModulo {
  moduloId: string;
  generado: string;
  modelo: string;
  /** Igual que el material común: solo las ven los alumnos cuando una persona las ha revisado. */
  revisado: boolean;
  infografias: Infografia[];
}

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
