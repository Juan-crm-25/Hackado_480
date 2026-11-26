import { ruta } from "@/server/compartido/http";
import { esquemaDestinoPuntos, esquemaPuntosProfesor } from "@/server/foro/esquemas";
import { darPuntos, quitarPuntos } from "@/server/foro/servicio";

/** El profesor del curso (o un admin) da o cambia los puntos de un tema o comentario: { temaId | comentarioId, puntos: 1|3|6, motivo }. */
export const PUT = ruta({ acceso: "usuario", cuerpo: esquemaPuntosProfesor }, ({ usuario, cuerpo }) => darPuntos(usuario, cuerpo));

/** Quita los puntos del profesor de un tema o comentario: { temaId | comentarioId } → 204. */
export const DELETE = ruta({ acceso: "usuario", cuerpo: esquemaDestinoPuntos }, ({ usuario, cuerpo }) => quitarPuntos(usuario, cuerpo));
