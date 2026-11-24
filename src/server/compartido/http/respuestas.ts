import "server-only";
import type { ErrorApi } from "@/lib/types";
import { type CodigoError, ErrorApp } from "../errores";

/** Forma de todas las respuestas de error de la API. Amplía `ErrorApi` de `types.ts`. */
export type RespuestaError = {
  error: string;
  codigo: CodigoError | "ERROR_INTERNO";
  detalles?: unknown;
};

// Comprobación de tipos: RespuestaError tiene que seguir siendo un ErrorApi.
const _compatibleConErrorApi: ErrorApi = {} as RespuestaError;
void _compatibleConErrorApi;

/** Respuesta JSON. Sin datos (`undefined`) responde 204 sin cuerpo. */
export function respuestaJson(datos: unknown, status = 200): Response {
  if (datos === undefined) return new Response(null, { status: 204 });
  return Response.json(datos, { status });
}

/** Traduce cualquier error a su respuesta HTTP. Los errores no previstos nunca enseñan su mensaje. */
export function respuestaError(error: unknown): Response {
  if (error instanceof ErrorApp) {
    const cuerpo: RespuestaError = { error: error.message, codigo: error.codigo };
    if (error.detalles !== undefined) cuerpo.detalles = error.detalles;
    return Response.json(cuerpo, { status: error.status });
  }
  console.error(error);
  const cuerpo: RespuestaError = { error: "Error interno", codigo: "ERROR_INTERNO" };
  return Response.json(cuerpo, { status: 500 });
}
