/** A dónde ir tras entrar o registrarse cuando no hay un destino válido. */
export const DESTINO_POR_DEFECTO = "/dashboard";

/**
 * Destino tras el login a partir de `?volver=`. Solo acepta rutas internas («/algo»), nunca otra web
 * (`//dominio`, `/\dominio`, `https:`…), para que el enlace de login no sirva de redirección abierta.
 * Tampoco vuelve al propio login o registro.
 */
export function destinoTrasLogin(volver: string | null | undefined): string {
  if (!volver || !volver.startsWith("/") || volver.startsWith("//") || volver.startsWith("/\\")) {
    return DESTINO_POR_DEFECTO;
  }
  const ruta = volver.split(/[?#]/)[0];
  if (ruta === "/login" || ruta === "/registro") return DESTINO_POR_DEFECTO;
  return volver;
}
