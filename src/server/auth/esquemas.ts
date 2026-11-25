import "server-only";
import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Escribe un email válido" }));

export const esquemaLogin = z.object({
  email,
  contrasena: z.string().min(1, { error: "Escribe tu contraseña" }),
});

export const esquemaRegistro = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: "Escribe tu nombre" })
    .max(80, { error: "El nombre es demasiado largo" }),
  email,
  contrasena: z
    .string()
    .min(8, { error: "La contraseña necesita al menos 8 caracteres" })
    .max(128, { error: "La contraseña es demasiado larga" }),
});

export type DatosLogin = z.output<typeof esquemaLogin>;
export type DatosRegistro = z.output<typeof esquemaRegistro>;
