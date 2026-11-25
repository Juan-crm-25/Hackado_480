import { describe, expect, it } from "vitest";
import { COOKIE_SESION, cookieBorrada, cookieSesion, leerTokenSesion } from "./cookie";

const peticion = (cookie?: string) =>
  new Request("http://localhost/api/x", { headers: cookie ? { cookie } : {} });

describe("cookie de sesión", () => {
  it("lee el token entre otras cookies", () => {
    expect(leerTokenSesion(peticion(`otra=1; ${COOKIE_SESION}=abc123; tema=oscuro`))).toBe("abc123");
  });

  it("devuelve null sin cookie o con el token vacío", () => {
    expect(leerTokenSesion(peticion())).toBeNull();
    expect(leerTokenSesion(peticion("otra=1"))).toBeNull();
    expect(leerTokenSesion(peticion(`${COOKIE_SESION}=`))).toBeNull();
  });

  it("crea una cookie httpOnly, SameSite=Lax, para toda la web y con caducidad", () => {
    const expira = new Date("2030-01-01T00:00:00Z");
    const cookie = cookieSesion("abc123", expira);
    expect(cookie).toContain(`${COOKIE_SESION}=abc123`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Expires=${expira.toUTCString()}`);
  });

  it("la cookie borrada caduca ya", () => {
    const cookie = cookieBorrada();
    expect(cookie).toContain(`${COOKIE_SESION}=;`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Path=/");
  });
});
