import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/server/auth/cookie";

/**
 * Comprobación OPTIMISTA (AGENTS.md, «API architecture»): si no hay cookie de sesión, las páginas que
 * piden sesión redirigen al login recordando a dónde iba el usuario. No valida la sesión ni autoriza
 * nada: eso lo hacen `requerirUsuarioActual()` en las páginas y `ruta()` en la API.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.get(COOKIE_SESION)?.value) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("volver", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

/** Páginas que piden sesión: «Tus cursos» (panel y módulos), el tutor, el perfil y el pago. La web pública no. */
export const config = {
  matcher: ["/dashboard/:path*", "/modulos/:path*", "/tutor/:path*", "/perfil/:path*", "/pago/:path*"],
};
