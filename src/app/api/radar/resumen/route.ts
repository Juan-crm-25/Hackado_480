import { ruta } from "@/server/compartido/http";
import { esquemaQueryRadar } from "@/server/radar/esquemas";
import { obtenerResumenDudas } from "@/server/radar/servicio";

/**
 * GET /api/radar/resumen?curso=<slug> — resumen con IA de las dudas al tutor (agente analista, #5).
 * Aparte del Radar: puede tardar unos segundos o fallar (502) sin que el resto del Radar deje de verse.
 * Mismos permisos que el Radar: rol profesor en ruta() y profesor de ESE curso (o admin) en el servicio.
 */
export const GET = ruta({ acceso: "profesor", query: esquemaQueryRadar }, ({ usuario, query }) => obtenerResumenDudas(usuario, query.curso));
