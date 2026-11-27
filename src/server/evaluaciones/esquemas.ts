import "server-only";
import { z } from "zod";

export const esquemaParamsModulo = z.object({
  id: z.string().trim().min(1),
});

export const esquemaResponderDiagnostico = z.object({
  respuestas: z
    .record(z.string().min(1).max(100), z.number().int().min(0).max(10))
    .refine((r) => Object.keys(r).length > 0 && Object.keys(r).length <= 10),
});

export type DatosResponderDiagnostico = z.output<typeof esquemaResponderDiagnostico>;