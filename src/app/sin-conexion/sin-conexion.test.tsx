import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SinConexion from "./page";

describe("página sin conexión (la que el service worker muestra sin red)", () => {
  const html = renderToStaticMarkup(<SinConexion />);

  it("explica qué pasa con texto, no solo con el icono", () => {
    expect(html).toMatch(/<h1[^>]*>Sin conexión<\/h1>/);
    expect(html).toContain("Comprueba tu conexión");
  });

  it("ofrece reintentar como acción destacada", () => {
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>[\s\S]*Reintentar/);
    expect(html).toContain("bg-brand");
  });

  it("no lleva datos del alumno ni la navegación (se guarda en la caché del dispositivo)", () => {
    expect(html).not.toContain("Hola");
    expect(html).not.toContain("Tus cursos");
  });
});
