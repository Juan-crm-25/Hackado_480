import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { COOKIE_SESION } from "./cookie";
import type { UsuarioSesion } from "./roles";
import { usuarioDeToken } from "./servicio";

/**
 * Usuario de la sesión para las páginas (Server Components), o `null` si es un visitante.
 * Lee `cookies()`, así que con Cache Components va dentro de un `<Suspense>`.
 * Si la BBDD falla se trata como visitante (nunca da acceso por error).
 * Con cache() de React, varias llamadas en la misma petición (avatar, barras de navegación…) hacen una sola consulta.
 */
export const obtenerUsuarioActual = cache(async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;
  try {
    return await usuarioDeToken(token);
  } catch (error) {
    console.error(error);
    return null;
  }
});

/** Como `obtenerUsuarioActual()`, pero sin sesión válida lleva al login. */
export async function requerirUsuarioActual(): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}
