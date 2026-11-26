import "server-only";
import { z } from "zod";

/** POST /api/tutor: el alumno sale de la sesión; `alumnoId`, si llega, se ignora. */
export const esquemaPeticionTutor = z.object({
  moduloId: z.string().trim().min(1).max(100),
  mensaje: z.string().trim().min(1, { error: "Escribe tu pregunta" }).max(1000, { error: "La pregunta es demasiado larga (máximo 1000 caracteres)" }),
  historial: z
    .array(z.object({ rol: z.enum(["alumno", "tutor"]), texto: z.string().max(4000) }))
    .max(50)
    .optional(),
});

export type DatosPeticionTutor = z.output<typeof esquemaPeticionTutor>;

/** POST /api/tutor/humano: la pregunta (preguntaId de POST /api/tutor) que el alumno pasa a un tutor humano. */
export const esquemaPasarATutorHumano = z.object({ preguntaId: z.string().trim().min(1).max(100) });

/** GET /api/tutor/humano?modulo=<slug>: las dudas del alumno en ese módulo. */
export const esquemaQueryMisDudas = z.object({ modulo: z.string().trim().min(1).max(100) });

/** POST /api/radar/dudas/[id]/respuesta: la respuesta del profesor. */
export const esquemaParamsDuda = z.object({ id: z.string().trim().min(1).max(100) });
export const esquemaRespuestaHumana = z.object({
  respuesta: z.string().trim().min(1, { error: "Escribe la respuesta" }).max(2000, { error: "La respuesta es demasiado larga (máximo 2000 caracteres)" }),
});
