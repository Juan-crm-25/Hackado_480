import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EsqueletoFormulario } from "./esqueleto-formulario";

const contar = (html: string, patron: RegExp) => html.match(patron)?.length ?? 0;

describe("EsqueletoFormulario", () => {
  it("avisa a los lectores de pantalla de que está cargando", () => {
    const html = renderToStaticMarkup(<EsqueletoFormulario variante="login" />);
    expect(html).toMatch(/role="status"/);
    expect(html).toMatch(/<span class="sr-only">Cargando…<\/span>/);
  });

  it("login: dos campos, el enlace de contraseña olvidada, botón, botones sociales y enlace final", () => {
    const html = renderToStaticMarkup(<EsqueletoFormulario variante="login" />);
    expect(contar(html, /data-esqueleto="campo"/g)).toBe(2);
    expect(contar(html, /data-esqueleto="olvidada"/g)).toBe(1);
    expect(contar(html, /data-esqueleto="pista"/g)).toBe(0);
    expect(contar(html, /data-esqueleto="social"/g)).toBe(3);
  });

  it("registro: tres campos y la pista de la contraseña, sin enlace de contraseña olvidada", () => {
    const html = renderToStaticMarkup(<EsqueletoFormulario variante="registro" />);
    expect(contar(html, /data-esqueleto="campo"/g)).toBe(3);
    expect(contar(html, /data-esqueleto="pista"/g)).toBe(1);
    expect(contar(html, /data-esqueleto="olvidada"/g)).toBe(0);
  });
});
