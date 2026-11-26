import { ruta } from "@/server/compartido/http";
import { esquemaParamsDuda, esquemaRespuestaHumana } from "@/server/tutor/esquemas";
import { responderDudaHumana } from "@/server/tutor/servicio";

/**
 * POST /api/radar/dudas/[id]/respuesta — el profesor responde una duda pasada a un tutor humano (H9).
 * La respuesta la escribe él, sin IA. Solo el profesor de ese curso o un admin; ya respondida: 409.
 */
export const POST = ruta({ acceso: "profesor", params: esquemaParamsDuda, cuerpo: esquemaRespuestaHumana }, ({ usuario, params, cuerpo }) =>
  responderDudaHumana(usuario, params.id, cuerpo.respuesta),
);
