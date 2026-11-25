import "server-only";
import { z } from "zod";

export const esquemaParamsCurso = z.object({ slug: z.string().trim().min(1) });

export const esquemaRuta = z.object({
  valoraciones: z
    .record(z.string().max(100), z.enum(["mucho", "interesa", "sabe"]))
    .refine((v) => Object.keys(v).length <= 100, { error: "Demasiados módulos" }),
});

export type DatosRuta = z.output<typeof esquemaRuta>;
