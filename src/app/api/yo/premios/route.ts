import { ruta } from "@/server/compartido/http";
import { obtenerSaldoPremios } from "@/server/recompensas/servicio";

/** Saldo de puntos del perfil: { foro, demo, canjeado, saldo, canjeados }. */
export const GET = ruta({ acceso: "usuario" }, ({ usuario }) => obtenerSaldoPremios(usuario.id));
