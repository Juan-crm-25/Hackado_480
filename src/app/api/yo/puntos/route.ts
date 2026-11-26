import { ruta } from "@/server/compartido/http";
import { obtenerPuntosDelAlumno } from "@/server/recompensas/servicio";

/** Puntos del foro del usuario de la sesión: { total, respuestas, profesor }. */
export const GET = ruta({ acceso: "usuario" }, ({ usuario }) => obtenerPuntosDelAlumno(usuario.id));
