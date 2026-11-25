import { cookieSesion, respuestaConCookie } from "@/server/auth/cookie";
import { esquemaRegistro } from "@/server/auth/esquemas";
import { registrar } from "@/server/auth/servicio";
import { ruta } from "@/server/compartido/http";

/** Registro simulado: crea una cuenta de alumno y deja la sesión iniciada. */
export const POST = ruta({ acceso: "publico", cuerpo: esquemaRegistro }, async ({ cuerpo }) => {
  const { usuario, token, expira } = await registrar(cuerpo);
  const { nombre, email, rol } = usuario;
  return respuestaConCookie({ usuario: { nombre, email, rol } }, cookieSesion(token, expira), 201);
});
