import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { preguntarAlTutor } from "@/lib/agentes/tutor";
import { getCurso, getModulo } from "@/lib/catalogo";
import { alumnosDemo } from "@/lib/datos-prueba";
import { buscarModulo, buscarUsuarioDemo, MENSAJE_SIN_SEED } from "@/server/matriculas/demo";
import { registrarIntercambio } from "@/server/tutor/servicio";
import type { ErrorApi, Mensaje, PeticionTutor, RespuestaTutor } from "@/lib/types";

const MAX_CARACTERES = 1000;

/**
 * POST /api/tutor — pregunta al tutor del módulo (issue #1). Ver agents/tutor.md.
 * Hasta el login, el alumno llega en `alumnoId` y se busca en la BBDD con el puente de src/server/matriculas/demo.ts.
 */
export async function POST(req: Request) {
  let peticion: PeticionTutor;
  try {
    peticion = (await req.json()) as PeticionTutor;
  } catch {
    return error("El cuerpo debe ser JSON", 400);
  }
  const pregunta = typeof peticion?.mensaje === "string" ? peticion.mensaje.trim() : "";
  if (!peticion?.alumnoId || !peticion?.moduloId || !pregunta) {
    return error("Faltan campos: alumnoId, moduloId y mensaje", 400);
  }
  if (pregunta.length > MAX_CARACTERES) {
    return error(`La pregunta es demasiado larga (máximo ${MAX_CARACTERES} caracteres)`, 400);
  }

  const modulo = getModulo(peticion.moduloId);
  if (!modulo) return error(`No existe el módulo "${peticion.moduloId}"`, 404);
  const alumno = alumnosDemo.find((a) => a.id === peticion.alumnoId);
  if (!alumno) return error(`No existe el alumno "${peticion.alumnoId}"`, 404);
  const usuario = await buscarUsuarioDemo(alumno.id);
  if (!usuario) return error(`El alumno "${alumno.id}" no está en la base de datos. ${MENSAJE_SIN_SEED}`, 404);

  const limite = await consumirConsulta(usuario.id);
  if (!limite.permitido) {
    return error("Has llegado al límite de preguntas de hoy. Mañana podrás seguir preguntando.", 429);
  }

  const historial = Array.isArray(peticion.historial)
    ? peticion.historial.filter((m) => (m?.rol === "alumno" || m?.rol === "tutor") && typeof m.texto === "string")
    : [];

  try {
    const salida = await preguntarAlTutor({
      curso: getCurso(),
      modulo,
      pregunta,
      historial,
      nombresOcultos: [alumno.nombre],
    });
    const respuesta: RespuestaTutor = {
      mensaje: salida.mensaje,
      fueraDeTemario: salida.fueraDeTemario,
      consultasRestantes: limite.restantes,
    };
    // Para el Radar (#5). Si el guardado falla, el alumno recibe igualmente su respuesta.
    if (!salida.simulado) await guardarParaElRadar(usuario.id, modulo.id, pregunta, alumno.nombre, salida.mensaje);
    return Response.json(respuesta);
  } catch (e) {
    // Nunca se devuelve el detalle interno al alumno; sí se registra (sin contenido de la pregunta).
    console.error(`[tutor] ${e instanceof ErrorIA ? e.message : "error inesperado"}`);
    return error("El tutor no está disponible ahora mismo. Inténtalo de nuevo en unos segundos.", 502);
  }
}

async function guardarParaElRadar(usuarioId: string, moduloSlug: string, pregunta: string, nombre: string, respuesta: Mensaje) {
  try {
    const moduloBd = await buscarModulo(moduloSlug);
    if (!moduloBd) return;
    await registrarIntercambio({ usuarioId, moduloId: moduloBd.id, pregunta, nombresOcultos: [nombre], respuesta });
  } catch {
    // Nunca se registra el contenido de la conversación.
    console.error("[tutor] no se pudo guardar la conversación");
  }
}

function error(mensaje: string, estado: number) {
  return Response.json({ error: mensaje } satisfies ErrorApi, { status: estado });
}
