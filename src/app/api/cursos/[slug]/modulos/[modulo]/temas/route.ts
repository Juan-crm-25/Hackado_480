import { respuestaJson, ruta } from "@/server/compartido/http";
import { esquemaNuevoTema, esquemaParamsModulo } from "@/server/foro/esquemas";
import { crearTema, listarTemas } from "@/server/foro/servicio";

/** Foro de un módulo (H10): sus dudas, la más nueva primero. Necesita el curso (403) y que el módulo exista (404). */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsModulo }, ({ usuario, params }) =>
  listarTemas(usuario, params.slug, params.modulo),
);

/** Abre una duda en el foro del módulo: { titulo (3–150), cuerpo (1–5000) } → 201 con el tema. */
export const POST = ruta({ acceso: "usuario", params: esquemaParamsModulo, cuerpo: esquemaNuevoTema }, async ({ usuario, params, cuerpo }) =>
  respuestaJson(await crearTema(usuario, params.slug, params.modulo, cuerpo), 201),
);
