import "server-only";
import { z } from "zod";
import { PUNTOS_PROFESOR } from "@/lib/foro";

/** /api/cursos/[slug]/modulos/[modulo]/temas: el módulo por el slug del curso y el suyo (únicos dentro del curso). */
export const esquemaParamsModulo = z.object({ slug: z.string().trim().min(1).max(100), modulo: z.string().trim().min(1).max(100) });

/** /api/temas/[id], /api/comentarios/[id]: un id mal formado se trata como inexistente (404) en el servicio. */
export const esquemaParamsId = z.object({ id: z.string().trim().min(1).max(100) });

export const esquemaNuevoTema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, { error: "El título necesita al menos 3 caracteres" })
    .max(150, { error: "El título es demasiado largo (máximo 150 caracteres)" }),
  cuerpo: z.string().trim().min(1, { error: "Escribe tu duda" }).max(5000, { error: "La duda es demasiado larga (máximo 5000 caracteres)" }),
});
export type DatosNuevoTema = z.output<typeof esquemaNuevoTema>;

export const esquemaNuevoComentario = z.object({
  cuerpo: z.string().trim().min(1, { error: "Escribe tu comentario" }).max(5000, { error: "El comentario es demasiado largo (máximo 5000 caracteres)" }),
  /** Comentario al que responde, del mismo tema. */
  respuestaAId: z.uuid().optional(),
});
export type DatosNuevoComentario = z.output<typeof esquemaNuevoComentario>;

/** PUT /api/comentarios/[id]/validacion: el profesor no puede devolverlo a «pendiente». */
export const esquemaValidacionProfesor = z.object({ validacion: z.enum(["correcta", "aproximada", "incorrecta", "no_respuesta"]) });
export type ValidacionProfesor = z.output<typeof esquemaValidacionProfesor>["validacion"];

const destino = { temaId: z.uuid().optional(), comentarioId: z.uuid().optional() };
const unSoloDestino = (d: { temaId?: string; comentarioId?: string }) => (d.temaId === undefined) !== (d.comentarioId === undefined);
const mensajeDestino = { error: "Indica un tema (temaId) o un comentario (comentarioId), uno solo" };

/** DELETE /api/foro/puntos: quita los puntos de un tema o de un comentario. */
export const esquemaDestinoPuntos = z.object(destino).refine(unSoloDestino, mensajeDestino);
export type DestinoPuntos = z.output<typeof esquemaDestinoPuntos>;

/** PUT /api/foro/puntos: da (o cambia) los puntos del profesor a un tema o comentario. */
export const esquemaPuntosProfesor = z
  .object({
    ...destino,
    puntos: z.literal(PUNTOS_PROFESOR, { error: "Los puntos son 1, 3 o 6" }),
    motivo: z.enum(["buena_pregunta", "buena_conducta"]),
  })
  .refine(unSoloDestino, mensajeDestino);
export type DatosPuntosProfesor = z.output<typeof esquemaPuntosProfesor>;
