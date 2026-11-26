import { esquemaEntregaTestModulo, esquemaParamsModulo } from "@/server/aprendizaje/esquemas";
import { empezarTestModulo, entregarTestModulo } from "@/server/aprendizaje/servicio";
import { ruta } from "@/server/compartido/http";

/**
 * GET /api/modulos/:id/test — test del módulo (#3): entre 5 y 8 preguntas al azar de su banco, sin solución ni
 * rúbrica, y la firma para entregarlo. Necesita el curso (401 sin sesión, 403 sin el curso). 404 si el módulo no
 * existe o aún no tiene banco aprobado. 429 si no le quedan consultas de IA para corregir sus preguntas abiertas.
 */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsModulo }, ({ usuario, params }) =>
  empezarTestModulo(usuario, params.id),
);

/**
 * POST /api/modulos/:id/test — entrega el test: lo corrige (test y respuesta corta con código; abiertas y de código
 * con IA), guarda cada respuesta, el test entero y el progreso, y devuelve la nota (se aprueba con un 7). 400 si las
 * respuestas no son del test que se le dio.
 */
export const POST = ruta(
  { acceso: "usuario", params: esquemaParamsModulo, cuerpo: esquemaEntregaTestModulo },
  ({ usuario, params, cuerpo }) => entregarTestModulo(usuario, params.id, cuerpo),
);
