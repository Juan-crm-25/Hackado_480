import { describe, expect, it } from "vitest";
import { destinosPrincipales, destinosSecundarios, esDestinoActivo } from "./destinos";

describe("destinos de la navegación", () => {
  it("son los de docs/estilo.md, en el mismo orden", () => {
    expect(destinosPrincipales.map((d) => d.etiqueta)).toEqual(["Inicio", "Tus cursos", "Tutor (IA)"]);
    expect(destinosSecundarios.map((d) => d.etiqueta)).toEqual(["Perfil", "Contáctanos", "Cerrar sesión"]);
  });

  it("cada destino con enlace apunta a su ruta", () => {
    expect(destinosPrincipales.map((d) => d.href)).toEqual(["/", "/dashboard", "/tutor"]);
    expect(destinosSecundarios.map((d) => ("href" in d ? d.href : undefined))).toEqual(["/perfil", "/contacto", undefined]);
  });
});

describe("esDestinoActivo", () => {
  it.each([
    ["/", "/", true],
    ["/cursos/python-desde-cero", "/", true],
    ["/cursos", "/", true],
    ["/dashboard", "/", false],
    ["/modulos/m1-html/tutor", "/", false],
    ["/perfil", "/", false],
    ["/dashboard", "/dashboard", true],
    ["/modulos/m1-html", "/dashboard", true],
    ["/modulos/m1-html/material", "/dashboard", true],
    ["/modulos/m1-html/tutor", "/dashboard", true],
    ["/cursos/desarrollo-web", "/dashboard", false],
    ["/cursos/desarrollo-web/ruta", "/dashboard", true],
    ["/cursos/desarrollo-web/ruta", "/", false],
    ["/pago/python-desde-cero", "/", true],
    ["/tutor", "/tutor", true],
    ["/tutor/algo", "/tutor", true],
    ["/tutores", "/tutor", false],
    ["/modulos/m1-html/tutor", "/tutor", false],
    ["/perfil", "/perfil", true],
    ["/contacto", "/perfil", false],
  ])("ruta %s con destino %s → %s", (pathname, href, esperado) => {
    expect(esDestinoActivo(pathname, href)).toBe(esperado);
  });

  it("sin ruta conocida no hay destino activo", () => {
    expect(esDestinoActivo(null, "/")).toBe(false);
  });
});
