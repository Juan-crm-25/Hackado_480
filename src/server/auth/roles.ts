import "server-only";
import type { rolUsuario } from "@/lib/db/schema";

/** Rol global del usuario: los valores del enum `rol_usuario` de la BBDD. */
export type RolUsuario = (typeof rolUsuario.enumValues)[number];

/** Nivel de acceso que pide un endpoint en `ruta()`. */
export type NivelAcceso = "publico" | "usuario" | RolUsuario;

/** Usuario de la sesión, tal como lo reciben `ruta()` y los servicios. */
export type UsuarioSesion = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  emailVerificado: boolean;
};

// Jerarquía: admin ⊃ profesor ⊃ alumno.
const RANGO: Record<RolUsuario, number> = { alumno: 1, profesor: 2, admin: 3 };

/**
 * ¿Puede este usuario (o el visitante, `null`) entrar en un endpoint de este nivel?
 * Solo mira el rol global; el acceso a un curso concreto se comprueba en el servicio.
 */
export function cumpleAcceso(usuario: UsuarioSesion | null, nivel: NivelAcceso): boolean {
  if (nivel === "publico") return true;
  if (!usuario) return false;
  if (nivel === "usuario") return true;
  return RANGO[usuario.rol] >= RANGO[nivel];
}
