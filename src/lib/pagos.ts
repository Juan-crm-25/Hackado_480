/**
 * Tipos y textos del pago simulado, compartidos por la API (src/server/pagos) y las pantallas.
 * La forma imita la de Stripe (`checkout.session`, `payment_intent`) para que pasar a Stripe cambie poco.
 */

export type MetodoPago = "tarjeta" | "paypal" | "bizum" | "cartera" | "gratis";

/** Métodos que se pueden elegir en la pantalla de pago (el gratis no se elige: lo decide el precio). */
export const METODOS_PAGO = [
  { id: "tarjeta", nombre: "Tarjeta" },
  { id: "paypal", nombre: "PayPal" },
  { id: "bizum", nombre: "Bizum" },
  { id: "cartera", nombre: "Apple Pay / Google Pay" },
] as const satisfies readonly { id: Exclude<MetodoPago, "gratis">; nombre: string }[];

export const NOMBRE_METODO: Record<MetodoPago, string> = {
  tarjeta: "Tarjeta",
  paypal: "PayPal",
  bizum: "Bizum",
  cartera: "Apple Pay / Google Pay",
  gratis: "Curso gratuito",
};

type CursoBreve = { slug: string; titulo: string };

export type SesionCheckout = {
  id: string;
  object: "checkout.session";
  amount_total: number;
  currency: string;
  payment_status: "unpaid";
  curso: CursoBreve;
};

export type IntentoPago = {
  id: string;
  object: "payment_intent";
  amount: number;
  currency: string;
  status: "succeeded";
  payment_method_types: MetodoPago[];
  /** Segundos desde 1970, como en Stripe. */
  created: number;
  pedido: { id: string; pagadoEn: string };
  curso: CursoBreve;
};

export type DatosTarjeta = { numero: string; caducidad: string; cvc: string; titular: string };

/** Cuerpo de POST /api/pagos/confirmar. */
export type PeticionConfirmar =
  | { sesion: string; metodo: "tarjeta"; tarjeta: DatosTarjeta }
  | { sesion: string; metodo: Exclude<MetodoPago, "tarjeta"> };
