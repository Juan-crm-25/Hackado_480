import { ruta } from "@/server/compartido/http";
import { esquemaParamsId } from "@/server/foro/esquemas";
import { obtenerHilo } from "@/server/foro/servicio";

/** Reintenta con after() la valoración de los comentarios pendientes. */
export const maxDuration = 30;

/** Un tema del foro con sus comentarios en árbol y si el que mira puede dar puntos. */
export const GET = ruta({ acceso: "usuario", params: esquemaParamsId }, ({ usuario, params }) => obtenerHilo(usuario, params.id));
