import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CabeceraPantalla } from "./cabecera-pantalla";

describe("CabeceraPantalla", () => {
  it("el enlace «Curso» vuelve al curso del alumno, no a la página pública ni a la lista", () => {
    const html = renderToStaticMarkup(<CabeceraPantalla seccion="Módulo" titulo="CSS" />);
    expect(html).toContain('href="/dashboard/desarrollo-web"');
    expect(html).not.toContain('href="/"');
  });

  it("el título va centrado, en su propio bloque y no pegado a la flecha", () => {
    const html = renderToStaticMarkup(<CabeceraPantalla seccion="Módulo" titulo="CSS" />);
    expect(html).toMatch(/<div class="[^"]*text-center[^"]*"><p[^>]*>Módulo<\/p><h1[^>]*>CSS<\/h1><\/div>/);
  });

  it("sin la prop «compartir» no hay botones de redes", () => {
    const html = renderToStaticMarkup(<CabeceraPantalla seccion="Módulo" titulo="CSS" />);
    expect(html).not.toContain("Compartir en");
    expect(html).not.toContain("<button");
  });

  it("con «compartir» muestra LinkedIn, X y WhatsApp como botones sin acción", () => {
    const html = renderToStaticMarkup(<CabeceraPantalla seccion="Módulo" titulo="CSS" compartir />);
    for (const red of ["LinkedIn", "X", "WhatsApp"]) {
      expect(html).toMatch(new RegExp(`<button[^>]*type="button"[^>]*aria-label="Compartir en ${red}"`));
    }
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).not.toContain("<a href=\"https");
  });
});
