import { getModulo } from "@/lib/catalogo";
import type { ErrorApi, PeticionTutor, RespuestaTutor } from "@/lib/types";

/**
 * POST /api/tutor — pregunta al tutor del módulo.
 * Hoy responde un texto fijo. La respuesta real llega con la capa de IA (#9) y el agente tutor (#1).
 */
export async function POST(req: Request) {
  let peticion: PeticionTutor;
  try {
    peticion = (await req.json()) as PeticionTutor;
  } catch {
    return Response.json({ error: "El cuerpo debe ser JSON" } satisfies ErrorApi, { status: 400 });
  }
  if (!peticion?.alumnoId || !peticion?.moduloId || !peticion?.mensaje) {
    return Response.json(
      { error: "Faltan campos: alumnoId, moduloId y mensaje" } satisfies ErrorApi,
      { status: 400 },
    );
  }
  const modulo = getModulo(peticion.moduloId);
  if (!modulo) {
    return Response.json({ error: `No existe el módulo "${peticion.moduloId}"` } satisfies ErrorApi, { status: 404 });
  }

  const respuesta: RespuestaTutor = {
    mensaje: {
      rol: "tutor",
      texto: `(Respuesta de prueba) Soy el tutor del módulo «${modulo.titulo}». Todavía no estoy conectado a la IA.`,
      fuentes: [],
    },
  };
  return Response.json(respuesta);
}
