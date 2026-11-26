import { ruta } from "@/server/compartido/http";
import { esquemaParamsModulo } from "@/server/material/esquemas";
import { infografiasDelModulo } from "@/server/material/servicio";

/**
 * GET /api/modulos/:id/infografias — infografías comunes del módulo (#7, #15), una por vídeo, de la tabla
 * material_clase y solo las REVISADAS. Necesita el curso (401 sin sesión, 403 sin el curso).
 * 404 si el módulo no existe o aún no tiene ninguna revisada. No llama a la IA.
 */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsModulo }, ({ usuario, params }) =>
  infografiasDelModulo(usuario, params.id),
);
