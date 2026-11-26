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

/** Para qué test es: el de cada vídeo (desbloquea el siguiente), el del módulo (lo completa) o el examen del curso. */
export type UsoEjercicio = "video" | "modulo" | "examen";

/** Ejercicio del banco, generado por la IA a partir de la plantilla del profesor. */
export interface Ejercicio extends EjercicioBase {
  id: string;
  moduloId: string;
  conceptoId: string;
  uso: UsoEjercicio;
  referencia: ReferenciaVideo;
  estado: EstadoEjercicio;
}

/** Versión que se envía al alumno: sin solución ni rúbrica. */
export type EjercicioPublico = Omit<Ejercicio, "solucion" | "rubrica" | "estado" | "uso">;

/** GET /api/modulos/:id/test — el test del módulo (#3): entre 5 y 8 preguntas de su banco, al azar. */
export interface TestModulo {
  moduloId: string;
  preguntas: EjercicioPublico[];
  /** Firma de las preguntas que han salido: se devuelve tal cual al entregar el test. */
  firma: string;
  /** Nota sobre 10 para aprobar y completar el módulo. */
  notaAprobado: number;
}

/** POST /api/modulos/:id/test — las respuestas del alumno, una por pregunta del test que se le dio. */
export interface PeticionTestModulo {
  firma: string;
  respuestas: { ejercicioId: string; respuesta: string | number }[];
}

/** Corrección de una pregunta del test. */
export interface ResultadoPregunta {
  ejercicioId: string;
  correcto: boolean;
  /** De 0 a 1. */
  puntuacion: number;
  feedback: string;
  /** Momento del vídeo que hay que repasar si no es correcta. */
  repasar?: ReferenciaVideo;
  /** La IA no ha podido corregirla con seguridad: la revisará el profesor. */
  revisionHumana: boolean;
}

export interface ResultadoTestModulo {
  /** Sobre 10. */
  nota: number;
  aprobado: boolean;
  notaAprobado: number;
  /** La mejor nota de todos sus intentos (cuenta el mejor). */
  mejorNota: number;
  /** Estado del módulo después del test. */
  estado: EstadoModulo;
  resultados: ResultadoPregunta[];
}

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
 * Material COMÚN del módulo (#2, #15): el resumen y las tarjetas YA REVISADOS de sus vídeos, juntados en orden.
 * Se genera una vez por vídeo con `npm run generar:material` (tabla material_clase), lo revisa una persona y lo
 * comparten todos los alumnos del curso. Respuesta de GET /api/modulos/:id/material.
 */
export interface MaterialComun {
  moduloId: string;
  resumen: SeccionResumen[];
  tarjetas: Tarjeta[];
}

export type NivelMaterial = "basico" | "normal" | "avanzado";

/** Lo que pide el alumno para crearse su propio material (#2). */
export interface PeticionMaterialPersonal {
  /** Ya no se usa en la API: el alumno sale de la sesión. El servicio lo rellena para el generador. */
  alumnoId?: string;
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

/**
 * Infografías comunes de un módulo YA REVISADAS: una por vídeo, sobre su concepto (#7, #15). Se guardan en
 * material_clase como el resto del material común. Respuesta de GET /api/modulos/:id/infografias.
 */
export interface InfografiasModulo {
  moduloId: string;
  infografias: Infografia[];
}

// ─── Radar del tutor ─────────────────────────────────────────────────────────

export interface AlertaAlumno {
  alumnoId: string;
  nombre: string; // solo lo ve el profesor del curso; la IA solo ve seudónimos
  motivo: "fallos_repetidos" | "inactividad";
  moduloId: string;
  conceptoId?: string;
  detalle: string;
  /** Cuándo pasó lo que se avisa (el último fallo o la última actividad). ISO 8601. */
  fecha: string;
}

export interface ConceptoFallado {
  moduloId: string;
  conceptoId: string;
  /** Nombre del concepto, para mostrarlo. */
  concepto: string;
  porcentajeFallo: number; // de 0 a 1
  /** Intentos con los que se calcula el porcentaje. */
  intentos: number;
}

/** Dudas que los alumnos han hecho al tutor IA en un módulo (ya filtradas). */
export interface DudasModulo {
  moduloId: string;
  modulo: string;
  total: number;
  /** Las preguntas que más se repiten, de más a menos. */
  masRepetidas: { texto: string; veces: number }[];
}

export interface InformeRadar {
  curso: { slug: string; titulo: string };
  generado: string; // ISO 8601
  /** Alumnos matriculados en el curso. */
  alumnos: number;
  /** Módulos del curso (slug → título), para mostrar el nombre del módulo de cada aviso. */
  modulos: { id: string; titulo: string }[];
  alertas: AlertaAlumno[];
  conceptosMasFallados: ConceptoFallado[];
  dudasFrecuentes: DudasModulo[];
}

/** Duda que un alumno ha pasado a un tutor humano (H9), tal como la ve el alumno en su chat. */
export interface DudaHumana {
  id: string;
  /** Id de la pregunta del alumno (la que devolvió POST /api/tutor). */
  preguntaId: string;
  /** Texto de la pregunta, ya filtrado. */
  pregunta: string;
  moduloId: string;
  creada: string; // ISO 8601
  estado: "pendiente" | "respondida";
  /** La escribe el profesor, sin IA. */
  respuesta?: string;
  respondida?: string; // ISO 8601
}

/** Como la ve el profesor del curso en el Radar: con el alumno y el módulo. */
export interface DudaHumanaProfesor extends DudaHumana {
  alumno: string;
  modulo: string;
}

/** GET /api/radar/resumen: resumen de las dudas escrito por el agente analista (#5). Se pide aparte del Radar. */
export interface RespuestaResumenDudas {
  resumen: string;
  generado: string; // ISO 8601
}

// ─── API: peticiones y respuestas ────────────────────────────────────────────

export interface PeticionTutor {
  /** Ya no se usa: el alumno sale de la sesión. Se acepta para no romper clientes antiguos. */
  alumnoId?: string;
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
  /** Id de la pregunta guardada (para pasarla a un tutor humano, H9). No hay en modo simulado. */
  preguntaId?: string;
}

export interface PeticionIntento {
  alumnoId: string;
  ejercicioId: string;
  respuesta: string | number;
}

export interface ErrorApi {
  error: string;
}
