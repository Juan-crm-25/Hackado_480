import "server-only";
import { z } from "zod";
import { PREGUNTAS_MAXIMAS, PREGUNTAS_MINIMAS } from "@/lib/test-modulo";

/** /api/modulos/:id/test: el módulo por su slug (p. ej. "m2-css"). */
export const esquemaParamsModulo = z.object({ id: z.string().trim().min(1).max(100) });

/** POST /api/modulos/:id/test: una respuesta por pregunta del test que se le dio, con su firma. */
export const esquemaEntregaTestModulo = z.object({
  firma: z.string().min(1).max(200),
  respuestas: z
    .array(
      z.object({
        ejercicioId: z.uuid(),
        respuesta: z.union([z.string().max(4000), z.number().int().min(0).max(20)]),
      }),
    )
    .min(PREGUNTAS_MINIMAS)
    .max(PREGUNTAS_MAXIMAS),
});

export type DatosEntregaTestModulo = z.output<typeof esquemaEntregaTestModulo>;

/** POST /api/modulos/:id/tests-videos: las respuestas a las preguntas de UN vídeo (2 en el banco). */
export const esquemaTestVideo = z.object({
  videoId: z.string().trim().min(1).max(50),
  respuestas: z
    .array(
      z.object({
        ejercicioId: z.uuid(),
        respuesta: z.union([z.string().max(200), z.number().int().min(0).max(20)]),
      }),
    )
    .min(1)
    .max(4),
});

export type DatosTestVideo = z.output<typeof esquemaTestVideo>;
