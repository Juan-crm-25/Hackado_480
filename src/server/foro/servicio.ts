import "server-only";
import { after } from "next/server";
import { ErrorValidadorForo, validarComentarioForo } from "@/lib/agentes/validador-foro";
import { getDb, type Db } from "@/lib/db/client";
import { EMAIL_IA_FORO } from "@/lib/db/seed/datos";
import { calcularPuntosRespuestas, FRASES_SENSEI, type MotivoPuntos, type ValidacionForo } from "@/lib/foro";
import type { UsuarioSesion } from "../auth/roles";
import { datosInvalidos, noEncontrado, prohibido } from "../compartido/errores";
import { requerirAccesoCurso, requerirProfesorDelCurso } from "../matriculas/servicio";
import type { DatosNuevoComentario, DatosNuevoTema, DatosPuntosProfesor, DestinoPuntos, ValidacionProfesor } from "./esquemas";
import {
  borrarPuntos,
  guardarPuntos,
  guardarValidacionProfesor,
  guardarValoracionIa,
  guardarValoracionYRespuesta,
  insertarComentario,
  insertarTema,
  leerComentarioDelTema,
  leerComentarioParaValorar,
  leerComentariosDelTema,
  leerModuloDelCurso,
  leerPendientesParaReintento,
  leerTema,
  leerTemasDelModulo,
  type FilaAutor,
  type FilaComentario,
} from "./repositorio";

// ─── Tipos de la API (las pantallas los importan con `import type`) ─────────

/** Autor tal como lo ve la API: nunca el email. */
export interface AutorForo {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  /** Sensei, la IA del foro. */
  esIa: boolean;
  /** Rol global profesor o admin. */
  esProfesor: boolean;
}

export interface PuntosProfesorForo {
  puntos: number;
  motivo: MotivoPuntos;
}

export interface TemaResumen {
  id: string;
  titulo: string;
  cuerpo: string;
  creado: string;
  autor: AutorForo;
  comentarios: number;
  puntosProfesor: PuntosProfesorForo | null;
}

export interface ComentarioHilo {
  id: string;
  respuestaAId: string | null;
  cuerpo: string;
  creado: string;
  autor: AutorForo;
  validacion: ValidacionForo;
  validadoPor: "ia" | "profesor" | null;
  /** Puntos por la valoración (correcta +10, aproximada +5) con la regla anti-spam del tema (S12); no se guardan. */
  puntos: number;
  puntosProfesor: PuntosProfesorForo | null;
  respuestas: ComentarioHilo[];
}

export interface HiloForo {
  tema: Omit<TemaResumen, "comentarios">;
  curso: { slug: string };
  modulo: { slug: string; titulo: string };
  /** Árbol de comentarios: los de primer nivel, cada uno con sus respuestas (por `respuestaAId`). */
  comentarios: ComentarioHilo[];
  /** El que mira es profesor de este curso o admin. */
  puedeDarPuntos: boolean;
}

// ─── Dependencias ────────────────────────────────────────────────────────────

export interface DependenciasForo {
  validar: typeof validarComentarioForo;
  /** Programa trabajo para después de responder. En producción, `after()` de Next; en los tests, una cola. */
  programar: (tarea: () => Promise<void>) => void;
  ahora: () => Date;
  /** Último reintento por tema (ms). */
  reintentos: Map<string, number>;
}

/**
 * Marca del último reintento por tema, en la memoria de cada instancia. Debería vivir en la caché compartida
 * (`foro:reintento:<temaId>`, docs/arquitectura.md, sección 5), pero esa caché (issue #34) aún no existe: con
 * varias instancias el freno es por instancia, no global.
 */
const REINTENTOS = new Map<string, number>();

const DEPENDENCIAS: DependenciasForo = {
  validar: validarComentarioForo,
  programar: (tarea) => after(tarea),
  ahora: () => new Date(),
  reintentos: REINTENTOS,
};

const MINUTOS_REINTENTO = 10;
const MAX_REINTENTOS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Ayudas ──────────────────────────────────────────────────────────────────

const esSensei = (a: Pick<FilaAutor, "autorEmail">) => a.autorEmail === EMAIL_IA_FORO;
const esProfesorGlobal = (a: Pick<FilaAutor, "autorRol">) => a.autorRol === "profesor" || a.autorRol === "admin";

function aAutor(a: FilaAutor): AutorForo {
  return { id: a.autorId, nombre: a.autorNombre, imagenUrl: a.autorImagenUrl, esIa: esSensei(a), esProfesor: esProfesorGlobal(a) };
}

const aPuntos = (f: { puntos: number | null; motivo: MotivoPuntos | null }): PuntosProfesorForo | null =>
  f.puntos !== null && f.motivo !== null ? { puntos: f.puntos, motivo: f.motivo } : null;

/** Puntos de las respuestas de un tema (S12): solo cuentan los comentarios de alumnos. */
function puntosDelTema(filas: (Pick<FilaComentario, "id" | "autorId" | "validacion" | "creado"> & Pick<FilaAutor, "autorEmail" | "autorRol">)[]) {
  return calcularPuntosRespuestas(filas.filter((f) => !esSensei(f) && !esProfesorGlobal(f)));
}

function aComentario(f: FilaComentario, puntos: number): ComentarioHilo {
  return {
    id: f.id,
    respuestaAId: f.respuestaAId,
    cuerpo: f.cuerpo,
    creado: f.creado.toISOString(),
    autor: aAutor(f),
    validacion: f.validacion,
    validadoPor: f.validadoPor,
    puntos,
    puntosProfesor: aPuntos(f),
    respuestas: [],
  };
}

/** Construye el árbol por `respuestaAId`, conservando el orden de llegada (del más antiguo al más nuevo). */
function arbol(filas: FilaComentario[]): ComentarioHilo[] {
  const puntos = puntosDelTema(filas);
  const porId = new Map(filas.map((f) => [f.id, aComentario(f, puntos.get(f.id) ?? 0)]));
  const raiz: ComentarioHilo[] = [];
  for (const c of porId.values()) {
    const padre = c.respuestaAId ? porId.get(c.respuestaAId) : undefined;
    (padre ? padre.respuestas : raiz).push(c);
  }
  return raiz;
}

async function cargarTema(usuario: UsuarioSesion, temaId: string, db: Db) {
  const tema = UUID.test(temaId) ? await leerTema(temaId, db) : null;
  if (!tema) throw noEncontrado("No existe ese tema");
  await requerirAccesoCurso(usuario, tema.cursoSlug, db);
  return tema;
}

async function puedeDarPuntos(usuario: UsuarioSesion, cursoSlug: string, db: Db): Promise<boolean> {
  if (usuario.rol === "admin") return true;
  try {
    await requerirProfesorDelCurso(usuario, cursoSlug, db);
    return true;
  } catch {
    return false;
  }
}

// ─── Temas ───────────────────────────────────────────────────────────────────

async function cargarModulo(usuario: UsuarioSesion, cursoSlug: string, moduloSlug: string, db: Db) {
  const curso = await requerirAccesoCurso(usuario, cursoSlug, db);
  const modulo = await leerModuloDelCurso(curso.id, moduloSlug, db);
  if (!modulo) throw noEncontrado("No existe ese módulo en este curso");
  return modulo;
}

/** Dudas del foro de un módulo, la más nueva primero. Necesita acceso al curso. */
export async function listarTemas(usuario: UsuarioSesion, cursoSlug: string, moduloSlug: string, db: Db = getDb()): Promise<TemaResumen[]> {
  const modulo = await cargarModulo(usuario, cursoSlug, moduloSlug, db);
  const filas = await leerTemasDelModulo(modulo.id, db);
  return filas.map((f) => ({
    id: f.id,
    titulo: f.titulo,
    cuerpo: f.cuerpo,
    creado: f.creado.toISOString(),
    autor: aAutor(f),
    comentarios: Number(f.comentarios ?? 0),
    puntosProfesor: aPuntos(f),
  }));
}

/** Abre una duda en el foro del módulo. Necesita acceso al curso. */
export async function crearTema(
  usuario: UsuarioSesion,
  cursoSlug: string,
  moduloSlug: string,
  datos: DatosNuevoTema,
  db: Db = getDb(),
): Promise<TemaResumen> {
  const modulo = await cargarModulo(usuario, cursoSlug, moduloSlug, db);
  const { id } = await insertarTema({ moduloId: modulo.id, autorId: usuario.id, titulo: datos.titulo, cuerpo: datos.cuerpo }, db);
  const tema = (await leerTema(id, db))!;
  return {
    id: tema.id,
    titulo: tema.titulo,
    cuerpo: tema.cuerpo,
    creado: tema.creado.toISOString(),
    autor: aAutor(tema),
    comentarios: 0,
    puntosProfesor: null,
  };
}

// ─── Hilo ────────────────────────────────────────────────────────────────────

/**
 * Un tema con sus comentarios en árbol. Al abrirlo se reintentan (con `after()`) los pendientes de hace más de
 * 10 minutos: como mucho 5, los más antiguos primero, y como mucho una vez cada 10 minutos por tema.
 */
export async function obtenerHilo(usuario: UsuarioSesion, temaId: string, db: Db = getDb(), deps: DependenciasForo = DEPENDENCIAS): Promise<HiloForo> {
  const tema = await cargarTema(usuario, temaId, db);
  const [filas, darPuntosPermitido] = await Promise.all([leerComentariosDelTema(tema.id, db), puedeDarPuntos(usuario, tema.cursoSlug, db)]);
  await programarReintento(tema.id, tema.autorId, db, deps);
  return {
    tema: {
      id: tema.id,
      titulo: tema.titulo,
      cuerpo: tema.cuerpo,
      creado: tema.creado.toISOString(),
      autor: aAutor(tema),
      puntosProfesor: aPuntos(tema),
    },
    curso: { slug: tema.cursoSlug },
    modulo: { slug: tema.moduloSlug, titulo: tema.moduloTitulo },
    comentarios: arbol(filas),
    puedeDarPuntos: darPuntosPermitido,
  };
}

async function programarReintento(temaId: string, temaAutorId: string, db: Db, deps: DependenciasForo) {
  const ahora = deps.ahora().getTime();
  const ultimo = deps.reintentos.get(temaId);
  const espera = MINUTOS_REINTENTO * 60_000;
  if (ultimo !== undefined && ahora - ultimo < espera) return;
  const ids = await leerPendientesParaReintento(temaId, temaAutorId, new Date(ahora - espera), MAX_REINTENTOS, db);
  if (ids.length === 0) return;
  deps.reintentos.set(temaId, ahora);
  deps.programar(async () => {
    for (const id of ids) await validarSinRomper(id, db, deps);
  });
}

/** Lo que se ejecuta con `after()`: un fallo solo se registra, nunca llega al usuario. */
async function validarSinRomper(comentarioId: string, db: Db, deps: DependenciasForo) {
  try {
    await validarYResponder(comentarioId, db, deps);
  } catch (error) {
    console.error(`[foro] No se pudo valorar el comentario ${comentarioId}:`, error instanceof Error ? error.message : error);
  }
}

// ─── Comentarios ─────────────────────────────────────────────────────────────

/** Comenta en un tema (o responde a un comentario del mismo tema). Se guarda pendiente y la IA lo valora después. */
export async function crearComentario(
  usuario: UsuarioSesion,
  temaId: string,
  datos: DatosNuevoComentario,
  db: Db = getDb(),
  deps: DependenciasForo = DEPENDENCIAS,
): Promise<ComentarioHilo> {
  const tema = await cargarTema(usuario, temaId, db);
  if (datos.respuestaAId) {
    const padre = await leerComentarioDelTema(datos.respuestaAId, db);
    if (!padre || padre.temaId !== tema.id) throw datosInvalidos(undefined, "Ese comentario no es de este tema");
    if (esSensei(padre)) throw datosInvalidos(undefined, "No se puede responder a Sensei");
  }
  const id = await insertarComentario({ temaId: tema.id, autorId: usuario.id, cuerpo: datos.cuerpo, respuestaAId: datos.respuestaAId }, db);
  deps.programar(() => validarSinRomper(id, db, deps));
  const fila = await leerComentarioDelTema(id, db);
  return aComentario(fila!, 0); // recién creado: pendiente, sin puntos
}

export type ResultadoValoracion = "omitido" | "pendiente" | "valorado";

/**
 * Valora un comentario con la IA del foro (S4–S7) y, si es una respuesta, Sensei contesta en el hilo.
 * - No se valora (ni se llama a la IA) a Sensei, a profesores/admins ni al autor de la duda, ni lo que ya no está pendiente.
 * - `no_respuesta`: se marca sin puntos y Sensei no contesta.
 * - `dudosa` o error de la IA: se queda pendiente (para el profesor o el siguiente reintento).
 * - La valoración se guarda solo si sigue pendiente: nunca pisa la decisión del profesor.
 */
export async function validarYResponder(comentarioId: string, db: Db = getDb(), deps: DependenciasForo = DEPENDENCIAS): Promise<ResultadoValoracion> {
  const c = await leerComentarioParaValorar(comentarioId, db);
  if (!c || c.validacion !== "pendiente") return "omitido";
  if (esSensei(c) || esProfesorGlobal(c) || c.autorId === c.temaAutorId) return "omitido";

  let resultado: Awaited<ReturnType<typeof validarComentarioForo>>;
  try {
    resultado = await deps.validar({
      duda: { titulo: c.temaTitulo, cuerpo: c.temaCuerpo },
      comentario: c.cuerpo,
      nombres: [c.autorNombre, c.temaAutorNombre],
    });
  } catch (error) {
    // Nunca se registra el texto del comentario.
    console.error(`[foro] La IA no pudo valorar ${comentarioId}: ${error instanceof ErrorValidadorForo ? error.message : "error inesperado"}`);
    return "pendiente";
  }

  const fecha = deps.ahora();
  if (resultado.tipo === "dudosa") return "pendiente";
  if (resultado.tipo === "no_respuesta") {
    return (await guardarValoracionIa(c.id, "no_respuesta", fecha, db)) ? "valorado" : "omitido";
  }
  const guardado = await guardarValoracionYRespuesta(
    { comentarioId: c.id, temaId: c.temaId, valoracion: resultado.valoracion, frase: FRASES_SENSEI[resultado.valoracion], fecha },
    db,
  );
  return guardado ? "valorado" : "omitido";
}

/** Lo que el profesor puede valorar o premiar: comentarios de alumnos (ni de Sensei ni de profesores/admins). */
async function cargarComentarioDeAlumno(usuario: UsuarioSesion, comentarioId: string, db: Db) {
  const c = UUID.test(comentarioId) ? await leerComentarioParaValorar(comentarioId, db) : null;
  if (!c) throw noEncontrado("No existe ese comentario");
  await requerirProfesorDelCurso(usuario, c.cursoSlug, db);
  if (esSensei(c) || esProfesorGlobal(c)) throw prohibido("Solo se valoran y premian comentarios de alumnos");
  return c;
}

/** El profesor del curso (o un admin) valora un comentario. Siempre prevalece sobre la IA. */
export async function validarComoProfesor(
  usuario: UsuarioSesion,
  comentarioId: string,
  validacion: ValidacionProfesor,
  db: Db = getDb(),
): Promise<ComentarioHilo> {
  const c = await cargarComentarioDeAlumno(usuario, comentarioId, db);
  await guardarValidacionProfesor(c.id, validacion, usuario.id, new Date(), db);
  const filas = await leerComentariosDelTema(c.temaId, db);
  const fila = filas.find((f) => f.id === c.id)!;
  return aComentario(fila, puntosDelTema(filas).get(c.id) ?? 0);
}

// ─── Puntos del profesor (S8) ────────────────────────────────────────────────

/** Autor del tema o comentario al que van los puntos. Solo el profesor del curso o un admin, y solo a alumnos. */
async function cargarDestino(usuario: UsuarioSesion, destino: DestinoPuntos, db: Db) {
  if (destino.comentarioId) {
    const c = await cargarComentarioDeAlumno(usuario, destino.comentarioId, db);
    return { destino: { comentarioId: c.id }, alumnoId: c.autorId };
  }
  const tema = destino.temaId && UUID.test(destino.temaId) ? await leerTema(destino.temaId, db) : null;
  if (!tema) throw noEncontrado("No existe ese tema");
  await requerirProfesorDelCurso(usuario, tema.cursoSlug, db);
  if (esSensei(tema) || esProfesorGlobal(tema)) throw prohibido("Solo se premian temas de alumnos");
  return { destino: { temaId: tema.id }, alumnoId: tema.autorId };
}

/** Da +1, +3 o +6 a un tema o comentario de un alumno. Si ya tenía, se sustituyen (no se acumulan). */
export async function darPuntos(usuario: UsuarioSesion, datos: DatosPuntosProfesor, db: Db = getDb()): Promise<PuntosProfesorForo> {
  const { destino, alumnoId } = await cargarDestino(usuario, datos, db);
  if (alumnoId === usuario.id) throw prohibido("No puedes darte puntos a ti mismo");
  await guardarPuntos({ ...destino, profesorId: usuario.id, alumnoId, puntos: datos.puntos, motivo: datos.motivo }, db);
  return { puntos: datos.puntos, motivo: datos.motivo };
}

/** Quita los puntos del profesor de un tema o comentario. Si no tenía, no pasa nada. */
export async function quitarPuntos(usuario: UsuarioSesion, datos: DestinoPuntos, db: Db = getDb()): Promise<void> {
  const { destino } = await cargarDestino(usuario, datos, db);
  await borrarPuntos(destino, db);
}
