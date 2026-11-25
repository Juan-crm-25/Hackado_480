import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LayoutAcceso from "./layout";

/**
 * El cajón y el astronauta viven en el layout compartido de login y registro: al navegar entre
 * las dos pantallas solo cambia el contenido del cajón.
 */
describe("LayoutAcceso", () => {
  const html = renderToStaticMarkup(
    <LayoutAcceso>
      <p id="contenido">Contenido de la pantalla</p>
    </LayoutAcceso>,
  );

  it("pone el contenido de la pantalla dentro del cajón", () => {
    expect(html).toMatch(/data-slot="card"[^>]*>[\s\S]*id="contenido"/);
  });

  it("en web desenfoca un poco lo que hay detrás del cajón (el astronauta)", () => {
    expect(html).toMatch(/data-slot="card"[^>]*class="[^"]*lg:backdrop-blur-\[1\.5px\]/);
  });

  it("centra el logo en el panel oscuro de la web", () => {
    expect(html).toMatch(/<aside[^>]*>\s*<a[^>]*class="[^"]*\bself-center\b/);
  });

  it("muestra el astronauta en web y en móvil", () => {
    expect(html.match(/<img[^>]*src="[^"]*astronauta\.png/g)).toHaveLength(2);
  });
});
