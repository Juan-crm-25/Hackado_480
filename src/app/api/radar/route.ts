import { ruta } from "@/server/compartido/http";
import { esquemaQueryRadar } from "@/server/radar/esquemas";
import { obtenerRadar } from "@/server/radar/servicio";

/**
 * GET /api/radar?curso=<slug> — Radar del tutor (#5): alumnos atascados o inactivos, conceptos más fallados
 * y dudas frecuentes. ruta() exige rol profesor; el servicio comprueba que es profesor de ESE curso (o admin).
 */
export const GET = ruta({ acceso: "profesor", query: esquemaQueryRadar }, ({ usuario, query }) => obtenerRadar(usuario, query.curso));
