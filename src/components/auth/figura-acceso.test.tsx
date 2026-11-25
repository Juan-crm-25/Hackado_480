import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FiguraAcceso } from "./figura-acceso";

describe("FiguraAcceso", () => {
  const html = renderToStaticMarkup(<FiguraAcceso className="mx-auto w-56" />);

  it("muestra la ilustración del astronauta", () => {
    expect(html).toMatch(/<img[^>]*src="[^"]*astronauta\.png/);
  });

  it("es decorativa: los lectores de pantalla la ignoran y no captura clics", () => {
    expect(html).toMatch(/<img[^>]*alt=""/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/class="[^"]*\bpointer-events-none\b/);
  });

  it("flota arriba y abajo solo si no se ha pedido reducir el movimiento", () => {
    expect(html).toContain("motion-safe:animate-flotar");
  });

  it("la pantalla decide dónde va y su tamaño", () => {
    expect(html).toMatch(/class="[^"]*\bmx-auto\b[^"]*\bw-56\b/);
  });
});
