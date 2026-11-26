import { ruta } from "@/server/compartido/http";
import { esquemaQueryRadar } from "@/server/radar/esquemas";
import { listarDudasHumanasDelCurso } from "@/server/tutor/servicio";

/**
 * GET /api/radar/dudas?curso=<slug> — dudas que los alumnos han pasado a un tutor humano (H9): pendientes
 * y respondidas en los últimos 7 días. Rol profesor en ruta(); profesor de ESE curso (o admin) en el servicio.
 */
export const GET = ruta({ acceso: "profesor", query: esquemaQueryRadar }, ({ usuario, query }) => listarDudasHumanasDelCurso(usuario, query.curso));
