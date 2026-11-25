import { ruta } from "@/server/compartido/http";
import { esquemaConfirmar } from "@/server/pagos/esquemas";
import { confirmarPago } from "@/server/pagos/servicio";

/** Pago simulado, paso 2: cualquier tarjeta vale; marca el pedido como pagado y crea la matrícula. */
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaConfirmar }, ({ usuario, cuerpo }) =>
  confirmarPago(usuario, cuerpo),
);
