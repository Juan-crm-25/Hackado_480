import "server-only";
import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { filtrarTexto } from "@/lib/ai/privacidad";
import { preguntarAlTutor } from "@/lib/agentes/tutor";
import { getCurso, getModulo } from "@/lib/catalogo";
import { getDb, type Db } from "@/lib/db/client";
import type { Mensaje, RespuestaTutor } from "@/lib/types";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import type { UsuarioSesion } from "../auth/roles";
import { errorIa, limiteSuperado, noEncontrado } from "../compartido/errores";
import { buscarModulo } from "../matriculas/demo";
import { requerirAccesoCurso } from "../matriculas/servicio";
import type { DatosPeticionTutor } from "./esquemas";
import { guardarIntercambio } from "./repositorio";

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
