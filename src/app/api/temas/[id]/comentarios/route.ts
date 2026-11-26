import { respuestaJson, ruta } from "@/server/compartido/http";
import { esquemaNuevoComentario, esquemaParamsId } from "@/server/foro/esquemas";
import { crearComentario } from "@/server/foro/servicio";

/** La IA del foro valora el comentario con after(), después de responder. */
export const maxDuration = 30;

/** Comenta en un tema: { cuerpo (1–5000), respuestaAId? } → 201 con el comentario, pendiente de valorar. */
export const POST = ruta({ acceso: "usuario", params: esquemaParamsId, cuerpo: esquemaNuevoComentario }, async ({ usuario, params, cuerpo }) =>
  respuestaJson(await crearComentario(usuario, params.id, cuerpo), 201),
);
