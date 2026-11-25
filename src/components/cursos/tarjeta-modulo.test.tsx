import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TarjetaModulo } from "./tarjeta-modulo";

const MODULO = { id: "m1-html", titulo: "HTML", descripcion: "Estructura", numClases: 3, numConceptos: 3 };

const tarjeta = (html: string) => html.match(/<div[^>]*data-slot="card"[^>]*>/)?.[0] ?? "";

describe("TarjetaModulo", () => {
  it("un módulo dominado se distingue: marca, icono, texto y borde de color", () => {
    const html = renderToStaticMarkup(<TarjetaModulo modulo={MODULO} estado="dominado" indice={0} recomendado={false} />);
    expect(tarjeta(html)).toContain('data-estado="dominado"');
    expect(tarjeta(html)).toContain("border-brand");
    expect(html).toContain("lucide-circle-check");
    expect(html).toContain("Dominado");
    expect(html).toContain("Test superado");
  });

  it("un módulo completado se distingue igual", () => {
    const html = renderToStaticMarkup(<TarjetaModulo modulo={MODULO} estado="completado" indice={0} recomendado={false} />);
    expect(tarjeta(html)).toContain("border-brand");
    expect(html).toContain("Completado");
  });

  it("un módulo sin terminar no lleva la marca de superado", () => {
    for (const estado of ["pendiente", "en_curso"] as const) {
      const html = renderToStaticMarkup(<TarjetaModulo modulo={MODULO} estado={estado} indice={0} recomendado={false} />);
      expect(tarjeta(html)).not.toContain("border-brand");
      expect(html).not.toContain("lucide-circle-check");
      expect(html).not.toContain("Test superado");
    }
    expect(renderToStaticMarkup(<TarjetaModulo modulo={MODULO} estado="en_curso" indice={0} recomendado={false} />)).toContain(
      "En curso",
    );
  });

  it("muestra «Recomendado por tu tutor» en el módulo principal", () => {
    const html = renderToStaticMarkup(<TarjetaModulo modulo={MODULO} estado="pendiente" indice={0} recomendado />);
    expect(html).toContain("Recomendado por tu tutor");
  });

  it("enlaza a los vídeos, el material y el tutor del módulo", () => {
    const html = renderToStaticMarkup(<TarjetaModulo modulo={MODULO} estado="pendiente" indice={0} recomendado={false} />);
    expect(html).toContain('href="/modulos/m1-html"');
    expect(html).toContain('href="/modulos/m1-html/material"');
    expect(html).toContain('href="/modulos/m1-html/tutor"');
  });
});
