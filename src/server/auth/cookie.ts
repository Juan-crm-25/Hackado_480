import "server-only";

/** Nombre de la cookie con el token de la sesión. `src/proxy.ts` solo comprueba que existe. */
export const COOKIE_SESION = "hackado_sesion";

/** Token de la cookie de sesión de la petición, o `null` si no hay. */
export function leerTokenSesion(request: Request): string | null {
  const cabecera = request.headers.get("cookie");
  if (!cabecera) return null;
  for (const parte of cabecera.split(";")) {
    const [nombre, ...valor] = parte.trim().split("=");
    if (nombre === COOKIE_SESION) return valor.join("=") || null;
  }
  return null;
}

const seguraEnProduccion = () => (process.env.NODE_ENV === "production" ? "; Secure" : "");

/** Cabecera Set-Cookie de la sesión: httpOnly (el navegador no la lee con JS) y SameSite=Lax. */
export function cookieSesion(token: string, expira: Date): string {
  return `${COOKIE_SESION}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expira.toUTCString()}${seguraEnProduccion()}`;
}

/** Cabecera Set-Cookie que borra la cookie de sesión. */
export function cookieBorrada(): string {
  return `${COOKIE_SESION}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${seguraEnProduccion()}`;
}

/** Respuesta JSON con una cabecera Set-Cookie. Sin datos responde 204. */
export function respuestaConCookie(datos: unknown, cookie: string, status = 200): Response {
  const headers = new Headers({ "set-cookie": cookie });
  if (datos === undefined) return new Response(null, { status: 204, headers });
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(datos), { status, headers });
}
