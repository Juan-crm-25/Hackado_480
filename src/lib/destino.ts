/** A dónde ir tras entrar o registrarse cuando no hay un destino válido. */
export const DESTINO_POR_DEFECTO = "/dashboard";

const BASE = "http://destino.invalid";

/**
 * Destino tras el login a partir de `?volver=`. Solo acepta rutas internas («/algo»), nunca otra web,
 * para que el enlace de login no sirva de redirección abierta:
 * - rechaza espacios, caracteres de control y barras invertidas (el parser de URL quita tabuladores y
 *   saltos de línea, así que «/\t/malo» acabaría siendo «//malo»);
 * - y comprueba que, resuelta como URL, sigue en el mismo origen.
 * Tampoco vuelve al propio login o registro.
 */
export function destinoTrasLogin(volver: string | null | undefined): string {
  if (!volver || !volver.startsWith("/") || /[\s\u0000-\u001F\u007F\\]/.test(volver)) return DESTINO_POR_DEFECTO;

  let url: URL;
  try {
    url = new URL(volver, BASE);
  } catch {
    return DESTINO_POR_DEFECTO;
  }
  if (url.origin !== BASE || url.pathname.startsWith("//")) return DESTINO_POR_DEFECTO;
  if (url.pathname === "/login" || url.pathname === "/registro") return DESTINO_POR_DEFECTO;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Navega tras entrar, registrarse o cerrar sesión cargando el destino de cero (`location.replace`), no con el router.
 * Al cambiar la sesión cambia todo lo que el navegador tenía guardado: el router reutilizaba respuestas de antes, como
 * «/pago/… redirige al login», y se quedaba en bucle entre el pago y el login (Next lo muestra como «Rendering…»).
 * Al salir, además, podría enseñar páginas privadas del usuario anterior. Con `replace`, el login no queda en el historial.
 */
export function entrarConSesionNueva(destino: string, ubicacion: Pick<Location, "replace"> = window.location): void {
  ubicacion.replace(destino);
}

