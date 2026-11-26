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
