import { ruta } from "@/server/compartido/http";
import { esquemaCheckout } from "@/server/pagos/esquemas";
import { crearCheckout } from "@/server/pagos/servicio";

/** Pago simulado, paso 1: crea el pedido pendiente y devuelve una `checkout.session` ficticia. */
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaCheckout }, ({ usuario, cuerpo }) =>
  crearCheckout(usuario, cuerpo),
);
