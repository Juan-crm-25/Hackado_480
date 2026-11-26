import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { anuncios } from "@/lib/demo/anuncios";
import { TituloAnuncio } from "./titulo-anuncio";

const clases = (html: string) => html.match(/<h3[^>]*class="([^"]*)"/)?.[1].split(" ") ?? [];

describe("TituloAnuncio", () => {
  it("Cyber Monday: letra futurista con degradado de azules (tokens), sin perder el texto", () => {
    const html = renderToStaticMarkup(<TituloAnuncio titulo="Cyber Monday: −30 % en Python" estilo="cyber" />);
    expect(clases(html)).toEqual(
      expect.arrayContaining(["font-cyber", "bg-linear-to-r", "from-promo-cyber-1", "to-promo-cyber-2", "bg-clip-text", "text-transparent"]),
    );
    expect(html).toContain("Cyber Monday: −30 % en Python");
  });

  it("Navidad: letra navideña en rojo (token)", () => {
    const html = renderToStaticMarkup(<TituloAnuncio titulo="Navidad: regala aprendizaje" estilo="navidad" />);
    expect(clases(html)).toEqual(expect.arrayContaining(["font-navidad", "text-promo-navidad"]));
    expect(html).toContain("Navidad: regala aprendizaje");
  });

  it("los títulos con estilo son grandes (texto grande: basta 3:1 de contraste)", () => {
    for (const estilo of ["cyber", "navidad"] as const) {
      expect(clases(renderToStaticMarkup(<TituloAnuncio titulo="x" estilo={estilo} />))).toContain("text-2xl");
    }
  });

  it("los títulos con estilo van centrados", () => {
    for (const estilo of ["cyber", "navidad"] as const) {
      expect(clases(renderToStaticMarkup(<TituloAnuncio titulo="x" estilo={estilo} />))).toContain("text-center");
    }
  });

  it("sin estilo queda como un título de tarjeta normal", () => {
    expect(clases(renderToStaticMarkup(<TituloAnuncio titulo="Otro" />))).toEqual(["text-lg", "leading-tight", "font-bold"]);
  });
});

describe("anuncios de ejemplo", () => {
  it("Cyber Monday y Navidad llevan su estilo de letra", () => {
    expect(anuncios.map((a) => a.estilo)).toEqual(["cyber", "navidad"]);
  });

  it("cada uno lleva su astronauta: el de los cohetes en Python y el cocinero en Navidad", () => {
    expect(anuncios.map((a) => a.ilustracion)).toEqual([
      "/ilustraciones/astronauta-python.svg",
      "/ilustraciones/astronauta-cocina.svg",
    ]);
  });
});
