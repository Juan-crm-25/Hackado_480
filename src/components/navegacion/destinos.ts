import { GraduationCap, House, LogOut, Mail, MessageCircle, Radar, User, type LucideIcon } from "lucide-react";

/**
 * Destinos de la navegación de la app (docs/estilo.md, apartado 10, «Navegación de la app»).
 * Es la ÚNICA lista: la barra lateral, la barra inferior y el menú «Más» salen de aquí, así que
 * ninguna función se queda escondida en un tamaño de pantalla.
 */
export interface Destino {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Ruta del destino. Sin `href` es una acción (cerrar sesión). */
  href?: string;
}

/** Barra inferior en móvil y parte de arriba de la barra lateral en web. */
export const destinosPrincipales = [
  { id: "inicio", etiqueta: "Inicio", icono: House, href: "/" },
  { id: "cursos", etiqueta: "Tus cursos", icono: GraduationCap, href: "/dashboard" },
  { id: "tutor", etiqueta: "Tutor (IA)", icono: MessageCircle, href: "/tutor" },
] as const satisfies readonly (Destino & { href: string })[];

/**
 * Menú «Más» en móvil y pie de la barra lateral en web. «Cerrar sesión» siempre el último.
 * El perfil también se abre desde el avatar de la barra superior.
 */
export const destinosSecundarios = [
  { id: "perfil", etiqueta: "Perfil", icono: User, href: "/perfil" },
  { id: "contacto", etiqueta: "Contáctanos", icono: Mail, href: "/contacto" },
  { id: "cerrar-sesion", etiqueta: "Cerrar sesión", icono: LogOut },
] as const satisfies readonly Destino[];

/** Rol de quien navega (`null`: visitante). Coincide con `usuario.rol` de la BBDD. */
export type RolNavegacion = "alumno" | "profesor" | "admin" | null;

/** Destinos solo para profesores y admin: van al principio de los secundarios. */
export const destinosProfesor = [
  { id: "radar", etiqueta: "Radar", icono: Radar, href: "/radar" },
] as const satisfies readonly (Destino & { href: string })[];

/** Destinos secundarios según el rol: el Radar (#5), solo para profesores y admin. */
export function destinosSecundariosPara(rol: RolNavegacion): readonly Destino[] {
  return rol === "profesor" || rol === "admin" ? [...destinosProfesor, ...destinosSecundarios] : destinosSecundarios;
}

const esRutaOSubruta = (pathname: string, ruta: string) => pathname === ruta || pathname.startsWith(`${ruta}/`);

/**
 * Destino activo según la ruta:
 * - Inicio (`/`): la home pública exacta, las páginas públicas de los cursos (`/cursos/...`) y su pago (`/pago/...`).
 * - Tus cursos (`/dashboard`): el panel, las pantallas de los módulos (`/modulos/...`) y la ruta personalizada
 *   de un curso (`/cursos/:slug/ruta`).
 * - El resto: su ruta y sus subrutas.
 */
export function esDestinoActivo(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const esRutaPersonal = /^\/cursos\/[^/]+\/ruta(\/|$)/.test(pathname);
  if (href === "/") {
    return pathname === "/" || (esRutaOSubruta(pathname, "/cursos") && !esRutaPersonal) || esRutaOSubruta(pathname, "/pago");
  }
  if (href === "/dashboard") {
    return esRutaOSubruta(pathname, "/dashboard") || esRutaOSubruta(pathname, "/modulos") || esRutaPersonal;
  }
  return esRutaOSubruta(pathname, href);
}
