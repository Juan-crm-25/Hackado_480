import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CabeceraPantalla } from "./cabecera-pantalla";

describe("CabeceraPantalla", () => {
  it("el enlace «Curso» vuelve al panel del alumno, no a la página pública", () => {
    const html = renderToStaticMarkup(<CabeceraPantalla seccion="Módulo" titulo="CSS" />);
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain('href="/"');
  });
});
