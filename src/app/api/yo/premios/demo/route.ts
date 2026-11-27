import { ruta } from "@/server/compartido/http";
import { esquemaPuntosDemo } from "@/server/recompensas/esquemas";
import { sumarPuntosDemo } from "@/server/recompensas/servicio";

/** Botones de demo del perfil: suman 100 o 1000 puntos de demostración del MVP para poder enseñar el canje. */
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaPuntosDemo }, ({ usuario, cuerpo }) =>
  sumarPuntosDemo(usuario.id, cuerpo.puntos),
);
