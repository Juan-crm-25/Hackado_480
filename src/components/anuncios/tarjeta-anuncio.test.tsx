import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Anuncio } from "@/lib/demo/anuncios";
import { TarjetaAnuncio } from "./tarjeta-anuncio";

const ANUNCIO: Anuncio = {
  id: "cyber-monday",
  titulo: "Cyber Monday: −30 % en Python",
  texto: "Solo este lunes.",
  cta: "Ver el curso de Python",
  href: "/cursos/python-desde-cero",
  estilo: "cyber",
  ilustracion: "/ilustraciones/astronauta-python.svg",
};

describe("TarjetaAnuncio", () => {
  const html = renderToStaticMarkup(<TarjetaAnuncio anuncio={ANUNCIO} indice={0} />);

  it("pinta el anuncio: etiqueta, título con estilo, texto y enlace", () => {
    expect(html).toContain("Anuncio");
    expect(html).toContain("font-cyber");
    expect(html).toContain("Solo este lunes.");
    expect(html).toMatch(/<a[^>]*href="\/cursos\/python-desde-cero"[^>]*>Ver el curso de Python<\/a>/);
  });

  it("el astronauta va dentro de la tarjeta, en una esquina, decorativo y sin tapar el contenido", () => {
    const img = html.match(/<img[^>]*>/)?.[0] ?? "";
    expect(img).toContain('src="/ilustraciones/astronauta-python.svg"');
    expect(img).toContain('alt=""');
    for (const clase of ["absolute", "pointer-events-none", "bottom-0", "right-3"]) expect(img).toContain(clase);
    expect(img).not.toMatch(/\bright-0\b/);
    // Decorativo y de ~30 KB: no compite con el contenido al cargar.
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('decoding="async"');
    expect(html).toMatch(/data-slot="card"[^>]*class="[^"]*\brelative\b[^"]*\boverflow-hidden\b|class="[^"]*\brelative\b[^"]*\boverflow-hidden\b[^"]*"[^>]*data-slot="card"/);
    // El contenido va por encima y el texto deja sitio a la ilustración.
    expect(html).toMatch(/data-slot="card-header"[^>]*class="[^"]*\bz-10\b|class="[^"]*\bz-10\b[^"]*"[^>]*data-slot="card-header"/);
    expect(html).toMatch(/class="[^"]*\bpr-24\b/);
  });

  it("los anuncios de temporada no llevan borde, sino una sombra alrededor del color de su título", () => {
    const tarjeta = (estilo: Anuncio["estilo"]) =>
      renderToStaticMarkup(<TarjetaAnuncio anuncio={{ ...ANUNCIO, estilo }} indice={0} />).match(/<div[^>]*data-slot="card"[^>]*>/)?.[0] ?? "";
    expect(tarjeta("cyber")).toMatch(/\bborder-0\b/);
    // Sombra sin desplazamiento (por todos lados) y del color del título; sustituye a la shadow-sm de Card.
    expect(tarjeta("cyber")).toContain("shadow-[0_0_0.75rem]");
    expect(tarjeta("cyber")).toMatch(/\bshadow-promo-cyber-1\/40\b/);
    expect(tarjeta("navidad")).toMatch(/\bshadow-promo-navidad\/40\b/);
    expect(tarjeta("cyber")).not.toMatch(/\bshadow-sm\b/);
    expect(tarjeta(undefined)).not.toMatch(/border-0|shadow-promo/);
  });

  it("los anuncios de temporada no llevan la franja de color arriba (los demás sí)", () => {
    const franja = (estilo: Anuncio["estilo"]) =>
      /<div aria-hidden="true" class="h-1\.5/.test(renderToStaticMarkup(<TarjetaAnuncio anuncio={{ ...ANUNCIO, estilo }} indice={0} />));
    expect(franja("cyber")).toBe(false);
    expect(franja("navidad")).toBe(false);
    expect(franja(undefined)).toBe(true);
  });

  it("sin franja, los anuncios de temporada tienen más aire arriba", () => {
    const tarjeta = renderToStaticMarkup(<TarjetaAnuncio anuncio={ANUNCIO} indice={0} />).match(/<div[^>]*data-slot="card"[^>]*>/)?.[0] ?? "";
    expect(tarjeta).toMatch(/\bpt-6\b/);
    expect(tarjeta).not.toMatch(/(?<![\w:-])pt-0\b/);
    // Card quita el relleno de arriba si su primer hijo es una <img>: el astronauta no puede ir el primero.
    expect(renderToStaticMarkup(<TarjetaAnuncio anuncio={ANUNCIO} indice={0} />)).toMatch(/data-slot="card"[^>]*>(?!<img)/);
  });

  it("sin ilustración no pinta imagen ni reserva hueco", () => {
    const sin = renderToStaticMarkup(<TarjetaAnuncio anuncio={{ ...ANUNCIO, ilustracion: undefined }} indice={0} />);
    expect(sin).not.toContain("<img");
    expect(sin).not.toMatch(/\bpr-24\b/);
  });
});
