import { cookieBorrada, leerTokenSesion, respuestaConCookie } from "@/server/auth/cookie";
import { cerrarSesion } from "@/server/auth/servicio";
import { ruta } from "@/server/compartido/http";

/** Cierra la sesión de la cookie (si hay) y borra la cookie. Siempre 204. */
export const POST = ruta({ acceso: "publico" }, async ({ request }) => {
  const token = leerTokenSesion(request);
  if (token) await cerrarSesion(token);
  return respuestaConCookie(undefined, cookieBorrada());
});
