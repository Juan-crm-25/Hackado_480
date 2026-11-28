import { ruta } from "@/server/compartido/http";
import { esquemaParamsVideo } from "@/server/material/esquemas";
import { estudioDelVideo } from "@/server/material/servicio";

/**
 * GET /api/modulos/:id/videos/:video/estudio — panel de estudio de un vídeo (#39): su transcripción (agrupada) y su
 * resumen, tarjetas e infografía, solo lo REVISADO. Necesita el curso (401 sin sesión, 403 sin el curso); 404 si el
 * módulo o el vídeo no existen. No llama a la IA.
 */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsVideo }, ({ usuario, params }) =>
  estudioDelVideo(usuario, params.id, params.video),
);
