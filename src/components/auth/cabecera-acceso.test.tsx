import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CabeceraAcceso } from "./cabecera-acceso";

describe("CabeceraAcceso", () => {
  const html = renderToStaticMarkup(<CabeceraAcceso titulo="Crea tu cuenta">Es gratis.</CabeceraAcceso>);

  it("muestra el título como h1 y la frase debajo", () => {
    expect(html).toMatch(/<h1[^>]*>Crea tu cuenta<\/h1>/);
    expect(html).toMatch(/<p[^>]*>Es gratis\.<\/p>/);
  });

  it("no desplaza el texto respecto al formulario", () => {
    expect(html).not.toMatch(/<header[^>]*class="[^"]*-m-/);
  });
});
