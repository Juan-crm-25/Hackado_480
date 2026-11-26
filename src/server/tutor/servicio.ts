import "server-only";
import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { filtrarTexto } from "@/lib/ai/privacidad";
import { preguntarAlTutor } from "@/lib/agentes/tutor";
import { getCurso, getModulo } from "@/lib/catalogo";
import { getDb, type Db } from "@/lib/db/client";
import type { DudaHumana, DudaHumanaProfesor, Mensaje, RespuestaTutor } from "@/lib/types";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import type { UsuarioSesion } from "../auth/roles";
import { conflicto, errorIa, limiteSuperado, noEncontrado } from "../compartido/errores";
import { buscarModulo } from "../matriculas/demo";
import { requerirAccesoCurso, requerirProfesorDelCurso } from "../matriculas/servicio";
import type { DatosPeticionTutor } from "./esquemas";
import { crearDudaHumana, guardarIntercambio, guardarRespuestaHumana, leerDudasHumanas, leerPregunta } from "./repositorio";

export interface IntercambioSinFiltrar {
  usuarioId: string;
  moduloId: string;
  /** La pregunta tal como la escribió el alumno. */
  pregunta: string;
  /** Nombres que no pueden quedar guardados (el del alumno, como mínimo). */
  nombresOcultos: string[];
  respuesta: Mensaje;
}

/**
 * Guarda una consulta al tutor para el Radar (#5): conversaciones del alumno por módulo, que caducan a los 90 días.
 *
 * Se guarda SOLO el texto filtrado, el mismo que llegó a la IA (sin emails, teléfonos, DNI ni nombres).
 * La respuesta también se filtra: el modelo podría repetir algo de la pregunta.
 */
export async function registrarIntercambio(
  datos: IntercambioSinFiltrar,
  db: Db = getDb(),
): Promise<{ conversacionId: string; preguntaId: string }> {
  return guardarIntercambio(
    {
      usuarioId: datos.usuarioId,
      moduloId: datos.moduloId,
      pregunta: filtrarTexto(datos.pregunta, datos.nombresOcultos).texto,
      respuesta: {
        texto: filtrarTexto(datos.respuesta.texto, datos.nombresOcultos).texto,
        fuentes: datos.respuesta.fuentes ?? [],
      },
    },
    db,
  );
}

export interface DependenciasTutor {
  preguntar: typeof preguntarAlTutor;
}

/**
 * POST /api/tutor (#1): el usuario de la SESIÓN pregunta al tutor de un módulo del curso de la demo.
 * Necesita acceso al curso (matrícula, profesor del curso o admin). Cuenta para su límite diario.
 * Guarda la conversación para el Radar (#5); si el guardado falla, el alumno recibe igualmente su respuesta.
 */
export async function consultarTutor(
  usuario: UsuarioSesion,
  peticion: DatosPeticionTutor,
  db: Db = getDb(),
  deps: DependenciasTutor = { preguntar: preguntarAlTutor },
): Promise<RespuestaTutor> {
  const modulo = getModulo(peticion.moduloId);
  if (!modulo) throw noEncontrado(`No existe el módulo "${peticion.moduloId}"`);
  await requerirAccesoCurso(usuario, CURSO_DEMO_SLUG, db);

  const limite = await consumirConsulta(usuario.id, db);
  if (!limite.permitido) throw limiteSuperado("Has llegado al límite de preguntas de hoy. Mañana podrás seguir preguntando.");

  let salida: Awaited<ReturnType<typeof preguntarAlTutor>>;
  try {
    salida = await deps.preguntar({
      curso: getCurso(),
      modulo,
      pregunta: peticion.mensaje,
      historial: peticion.historial ?? [],
      nombresOcultos: [usuario.nombre],
    });
  } catch (e) {
    // Nunca se registra el contenido de la pregunta.
    console.error(`[tutor] ${e instanceof ErrorIA ? e.message : "error inesperado"}`);
    throw errorIa("El tutor no está disponible ahora mismo. Inténtalo de nuevo en unos segundos.");
  }

  const respuesta: RespuestaTutor = {
    mensaje: salida.mensaje,
    fueraDeTemario: salida.fueraDeTemario,
    consultasRestantes: limite.restantes,
  };
  if (salida.simulado) return respuesta;

  try {
    const moduloBd = await buscarModulo(modulo.id, db);
    if (moduloBd) {
      const { preguntaId } = await registrarIntercambio(
        { usuarioId: usuario.id, moduloId: moduloBd.id, pregunta: peticion.mensaje, nombresOcultos: [usuario.nombre], respuesta: salida.mensaje },
        db,
      );
      respuesta.preguntaId = preguntaId;
    }
  } catch {
    console.error("[tutor] no se pudo guardar la conversación");
  }
  return respuesta;
}

// ─── Tutor humano (H9) ───────────────────────────────────────────────────────
// El alumno pasa una pregunta suya al profesor del curso, que la responde desde el Radar. La respuesta, sin IA.

type FilaDuda = Awaited<ReturnType<typeof leerDudasHumanas>>[number];
const DIAS_RESPONDIDAS = 7;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function aDuda(f: FilaDuda): DudaHumana {
  return {
    id: f.id,
    preguntaId: f.preguntaId,
    pregunta: f.pregunta,
    moduloId: f.moduloSlug,
    creada: f.creada.toISOString(),
    estado: f.respuesta === null ? "pendiente" : "respondida",
    ...(f.respuesta !== null && f.respondida ? { respuesta: f.respuesta, respondida: f.respondida.toISOString() } : {}),
  };
}

const aDudaProfesor = (f: FilaDuda): DudaHumanaProfesor => ({ ...aDuda(f), alumno: f.alumno, modulo: f.moduloTitulo });

/** El alumno pasa SU pregunta a un tutor humano. Si no es suya (o no existe): 404. Pasarla dos veces no la duplica. */
export async function pasarATutorHumano(usuario: UsuarioSesion, preguntaId: string, db: Db = getDb()): Promise<DudaHumana> {
  const pregunta = UUID.test(preguntaId) ? await leerPregunta(preguntaId, db) : null;
  if (!pregunta || pregunta.rol !== "alumno" || pregunta.usuarioId !== usuario.id) throw noEncontrado("No existe esa pregunta");
  await crearDudaHumana(preguntaId, db);
  const [fila] = await leerDudasHumanas({ preguntaId }, db);
  return aDuda(fila);
}

/** Las dudas que el alumno ha pasado a un tutor humano en un módulo, con la respuesta cuando la hay. */
export async function listarMisDudasHumanas(usuario: UsuarioSesion, moduloSlug: string, db: Db = getDb()): Promise<DudaHumana[]> {
  return (await leerDudasHumanas({ usuarioId: usuario.id, moduloSlug }, db)).map(aDuda);
}

/**
 * Para el Radar: dudas pasadas a un tutor humano en el curso. Primero las pendientes (la más antigua antes),
 * después las respondidas en los últimos 7 días. Solo el profesor de ESE curso o un admin.
 */
export async function listarDudasHumanasDelCurso(
  usuario: UsuarioSesion,
  cursoSlug: string,
  db: Db = getDb(),
  ahora = new Date(),
): Promise<DudaHumanaProfesor[]> {
  await requerirProfesorDelCurso(usuario, cursoSlug, db);
  const filas = await leerDudasHumanas({ cursoSlug }, db);
  const desde = ahora.getTime() - DIAS_RESPONDIDAS * 24 * 3600 * 1000;
  const pendientes = filas.filter((f) => f.respuesta === null);
  const respondidas = filas
    .filter((f) => f.respondida !== null && f.respondida.getTime() >= desde)
    .sort((a, b) => b.respondida!.getTime() - a.respondida!.getTime());
  return [...pendientes, ...respondidas].map(aDudaProfesor);
}

/** El profesor de ESE curso (o un admin) responde una duda. Ya respondida: 409. */
export async function responderDudaHumana(
  usuario: UsuarioSesion,
  dudaId: string,
  respuesta: string,
  db: Db = getDb(),
): Promise<DudaHumanaProfesor> {
  const [fila] = UUID.test(dudaId) ? await leerDudasHumanas({ id: dudaId }, db) : [];
  if (!fila) throw noEncontrado("No existe esa duda");
  await requerirProfesorDelCurso(usuario, fila.cursoSlug, db);
  if (!(await guardarRespuestaHumana(dudaId, usuario.id, respuesta.trim(), db))) throw conflicto("Esta duda ya está respondida");
  const [actualizada] = await leerDudasHumanas({ id: dudaId }, db);
  return aDudaProfesor(actualizada);
}
