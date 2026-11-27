import { ruta } from "@/server/compartido/http";
import { esquemaCanjePremio } from "@/server/recompensas/esquemas";
import { canjearPremio } from "@/server/recompensas/servicio";

/** Canjea un premio (simulación del MVP): resta sus puntos del saldo. 409 si ya lo tiene o no le llega. */
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaCanjePremio }, ({ usuario, cuerpo }) =>
  canjearPremio(usuario.id, cuerpo.premio),
);
