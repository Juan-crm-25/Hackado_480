import "server-only";
import { z } from "zod";

export const esquemaCheckout = z.object({
  curso: z.string().trim().min(1, { error: "Falta el curso" }),
});

const texto = (error: string) => z.string().trim().min(1, { error }).max(40);

/**
 * Pago SIMULADO: cualquier número, caducidad y CVC valen, solo no pueden ir vacíos.
 * Los datos de la tarjeta se validan y se descartan: nunca se guardan.
 */
const tarjeta = z.object({
  numero: texto("Escribe el número de la tarjeta"),
  caducidad: texto("Escribe la fecha de caducidad"),
  cvc: texto("Escribe el CVC"),
  titular: z.string().max(80).default(""),
});

const sesion = z.string().trim().min(1, { error: "Falta la sesión de pago" });

export const esquemaConfirmar = z.discriminatedUnion("metodo", [
  z.object({ sesion, metodo: z.literal("tarjeta"), tarjeta }),
  z.object({ sesion, metodo: z.enum(["paypal", "bizum", "cartera", "gratis"]) }),
]);

export type DatosCheckout = z.output<typeof esquemaCheckout>;
export type DatosConfirmar = z.output<typeof esquemaConfirmar>;
