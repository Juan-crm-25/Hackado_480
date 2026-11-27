import { esquemaParamsModulo, esquemaTestVideo } from "@/server/aprendizaje/esquemas";
import { comprobarTestVideo, testsDeLosVideos } from "@/server/aprendizaje/servicio";
import { ruta } from "@/server/compartido/http";

/**
 * GET /api/modulos/:id/tests-videos — test de cada vídeo (#3): las preguntas aprobadas de vídeo del módulo (2 por
 * vídeo), sin solución, agrupadas por vídeo. Necesita el curso (401 sin sesión, 403 sin el curso); 404 si no existe.
 */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsModulo }, ({ usuario, params }) =>
  testsDeLosVideos(usuario, params.id),
);

/**
 * POST /api/modulos/:id/tests-videos — corrige el test de un vídeo (sin IA) y guarda las respuestas. `superado` si
 * están todas bien: entonces se desbloquea el siguiente vídeo. 400 si no son justo las preguntas de ese vídeo.
 */
export const POST = ruta(
  { acceso: "usuario", params: esquemaParamsModulo, cuerpo: esquemaTestVideo },
  ({ usuario, params, cuerpo }) => comprobarTestVideo(usuario, params.id, cuerpo),
);
