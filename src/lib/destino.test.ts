import { describe, expect, it } from "vitest";
import { destinoTrasLogin } from "./destino";

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
  });

  it("no vuelve a las pantallas de login o registro", () => {
    expect(destinoTrasLogin("/login")).toBe("/dashboard");
    expect(destinoTrasLogin("/registro?volver=/perfil")).toBe("/dashboard");
  });
});
