import { describe, expect, it, vi } from "vitest";
import { destinoTrasLogin, entrarConSesionNueva } from "./destino";

describe("destinoTrasLogin", () => {
  it("vuelve a la ruta interna de la que venía, con su query", () => {
    expect(destinoTrasLogin("/modulos/m2-css/tutor")).toBe("/modulos/m2-css/tutor");
    expect(destinoTrasLogin("/cursos/python-desde-cero?x=1")).toBe("/cursos/python-desde-cero?x=1");
  });

  it("sin destino va a «Tus cursos»", () => {
    expect(destinoTrasLogin(null)).toBe("/dashboard");
    expect(destinoTrasLogin("")).toBe("/dashboard");
  });

  it("nunca sale de la web (evita redirecciones abiertas)", () => {
    expect(destinoTrasLogin("https://malo.example")).toBe("/dashboard");
    expect(destinoTrasLogin("//malo.example")).toBe("/dashboard");
    expect(destinoTrasLogin("/\\malo.example")).toBe("/dashboard");
    expect(destinoTrasLogin("javascript:alert(1)")).toBe("/dashboard");
    expect(destinoTrasLogin(" //malo.example")).toBe("/dashboard");
  });

  it("no se deja engañar por tabuladores o saltos de línea (el parser de URL los quita: «/\\t/malo» → «//malo»)", () => {
    expect(destinoTrasLogin("/\t/malo.example")).toBe("/dashboard");
    expect(destinoTrasLogin("/\n/malo.example")).toBe("/dashboard");
    expect(destinoTrasLogin("/\r\n/malo.example")).toBe("/dashboard");
  });

  it("no vuelve a las pantallas de login o registro", () => {
    expect(destinoTrasLogin("/login")).toBe("/dashboard");
    expect(destinoTrasLogin("/registro?volver=/perfil")).toBe("/dashboard");
  });
});

describe("entrarConSesionNueva", () => {
  it("carga el destino de cero (sin la caché del navegador de antes de entrar o salir) y sin dejar el login en el historial", () => {
    const ubicacion = { replace: vi.fn() };
    entrarConSesionNueva("/pago/python-desde-cero", ubicacion);
    expect(ubicacion.replace).toHaveBeenCalledWith("/pago/python-desde-cero");
  });
});
