import "server-only";
import type { UsuarioSesion } from "./roles";

/**
 * Usuario de la sesión de esta petición, o `null` si es un visitante.
 *
 * PROVISIONAL: Better Auth llega en el paso 2 (docs/arquitectura.md, sección 6). Hasta entonces
 * nadie tiene sesión, así que todo el mundo es visitante y solo pasan los endpoints `publico`.
 * El paso 2 sustituye solo el cuerpo de esta función; la firma se mantiene.
 */
export async function obtenerSesion(request: Request): Promise<UsuarioSesion | null> {
  void request;
  return null;
}
