import "server-only";
import { z } from "zod";
import { MAX_ENFOQUE } from "@/lib/agentes/material-personal";

/** POST /api/material-personal: el alumno sale de la sesión; `alumnoId`, si llega, se ignora. */
export const esquemaPeticionMaterialPersonal = z.object({
  moduloId: z.string().trim().min(1).max(100),
  tipo: z.enum(["resumen", "tarjetas"]),
  conceptoId: z.string().trim().min(1).max(100).optional(),
  nivel: z.enum(["basico", "normal", "avanzado"]).optional(),
  enfoque: z.string().max(MAX_ENFOQUE, { error: `El enfoque debe tener ${MAX_ENFOQUE} caracteres como máximo` }).optional(),
});

export type DatosPeticionMaterialPersonal = z.output<typeof esquemaPeticionMaterialPersonal>;

/** GET /api/material-personal?moduloId=<slug>: el material del alumno de la sesión (opcionalmente, de un módulo). */
export const esquemaQueryMaterialPersonal = z.object({ moduloId: z.string().trim().min(1).max(100).optional() });

/** /api/modulos/:id/material y /api/modulos/:id/infografias: el módulo por su slug (p. ej. "m2-css"). */
export const esquemaParamsModulo = z.object({ id: z.string().trim().min(1).max(100) });
