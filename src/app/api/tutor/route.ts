import { ruta } from "@/server/compartido/http";
import { esquemaPeticionTutor } from "@/server/tutor/esquemas";
import { consultarTutor } from "@/server/tutor/servicio";

/**
 * POST /api/tutor — pregunta al tutor del módulo (#1). Ver agents/tutor.md.
 * El alumno es el usuario de la SESIÓN (no un id que llegue en el cuerpo). El servicio comprueba que tiene
 * el curso, el límite diario, llama a la IA y guarda la conversación para el Radar (#5).
 */
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaPeticionTutor }, ({ usuario, cuerpo }) => consultarTutor(usuario, cuerpo));
