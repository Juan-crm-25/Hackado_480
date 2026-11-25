import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { config, proxy } from "./proxy";

const peticion = (ruta: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${ruta}`, { headers: cookie ? { cookie } : {} });

describe("proxy (comprobación optimista de la cookie)", () => {
  it("sin cookie redirige al login recordando a dónde iba", () => {
    const res = proxy(peticion("/modulos/m2-css/tutor?pregunta=1"));
    expect(res.status).toBe(307);
    const destino = new URL(res.headers.get("location")!);
    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("volver")).toBe("/modulos/m2-css/tutor?pregunta=1");
  });

  it("con la cookie deja pasar", () => {
    const res = proxy(peticion("/dashboard", `${COOKIE_SESION}=tok123`));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("solo se ejecuta en las páginas que piden sesión", () => {
    expect(config.matcher).toEqual(["/dashboard/:path*", "/modulos/:path*", "/tutor/:path*", "/perfil/:path*"]);
  });
});
