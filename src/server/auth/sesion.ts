import "server-only";
import { leerTokenSesion } from "./cookie";
import type { UsuarioSesion } from "./roles";
import { usuarioDeToken } from "./servicio";

/**
 * Usuario de la sesión de esta petición, o `null` si es un visitante.
 *
 * SIMULADO (SPEC.md, «Login simulado»): lee el token de la cookie y busca su fila en `sesion`.
 * Al conectar Better Auth (docs/arquitectura.md, sección 6) solo cambia el cuerpo; la firma se mantiene.
 */
export async function obtenerSesion(request: Request): Promise<UsuarioSesion | null> {
  const token = leerTokenSesion(request);
  return token ? usuarioDeToken(token) : null;
}
