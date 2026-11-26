import { ruta } from "@/server/compartido/http";
import { esquemaParamsModulo } from "@/server/material/esquemas";
import { materialComunDelModulo } from "@/server/material/servicio";

/**
 * GET /api/modulos/:id/material — material común del módulo (#2, #15): el resumen y las tarjetas de sus vídeos,
 * de la tabla material_clase y solo lo REVISADO. Necesita el curso (401 sin sesión, 403 sin el curso).
 * 404 si el módulo no existe o aún no tiene nada revisado. No llama a la IA.
 */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsModulo }, ({ usuario, params }) =>
  materialComunDelModulo(usuario, params.id),
);
