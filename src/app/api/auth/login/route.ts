import { cookieSesion, respuestaConCookie } from "@/server/auth/cookie";
import { esquemaLogin } from "@/server/auth/esquemas";
import { iniciarSesion } from "@/server/auth/servicio";
import { ruta } from "@/server/compartido/http";

/** Login simulado: email y contraseña → sesión en una cookie httpOnly. */
export const POST = ruta({ acceso: "publico", cuerpo: esquemaLogin }, async ({ cuerpo }) => {
  const { usuario, token, expira } = await iniciarSesion(cuerpo);
  const { nombre, email, rol } = usuario;
  return respuestaConCookie({ usuario: { nombre, email, rol } }, cookieSesion(token, expira));
});
