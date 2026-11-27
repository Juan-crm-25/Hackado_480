import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BarraPremios } from "./barra-premios";

const saldo = (puntos: number, canjeados: string[] = []) => ({
  foro: puntos,
  respuestas: puntos,
  profesor: 0,
  demo: 0,
  canjeado: 0,
  saldo: puntos,
  canjeados,
});
const pinta = (puntos: number, canjeados: string[] = []) => renderToStaticMarkup(<BarraPremios saldoInicial={saldo(puntos, canjeados)} />);

/** Etiqueta <img> del premio con esa imagen. */
const imagen = (html: string, src: string) => html.match(new RegExp(`<img[^>]*src="${src}"[^>]*>`))?.[0] ?? "";

describe("BarraPremios (perfil)", () => {
  it("muestra el saldo de la BBDD y una barra accesible con su progreso", () => {
    const html = pinta(220);
    expect(html).toContain("220 puntos");
    expect(html).toMatch(/role="progressbar"[^>]*aria-valuenow="220"/);
    expect(html).toMatch(/aria-valuemax="460"/);
  });

  it("en la cabecera, el título y al lado el total; debajo, en pequeño, de dónde sale cada punto", () => {
    const html = renderToStaticMarkup(
      <BarraPremios saldoInicial={{ foro: 8, respuestas: 5, profesor: 3, demo: 3000, canjeado: 100, saldo: 2908, canjeados: [] }} />,
    );
    // Título y total en la misma fila, con la copa delante del total.
    expect(html).toMatch(
      /<div class="flex items-center justify-between[^"]*"><h2[^>]*>[\s\S]*?Premios<\/h2><p[^>]*><svg[^>]*lucide-trophy[\s\S]*?2908 puntos<\/p><\/div>/,
    );
    // Desglose en dos filas, centradas en móvil: lo ganado en el foro y, debajo, demo y canjes.
    expect(html).toMatch(/<div class="[^"]*\btext-center\b[^"]*\bmd:text-left\b[^"]*"><p[^>]*>5 por respuestas · 3 del profesor<\/p><p[^>]*>3000 de demo · −100 canjeados<\/p><\/div>/);
  });

  it("la barra es de colores llamativos y solo brilla si el usuario acepta animaciones", () => {
    const html = pinta(220);
    expect(html).toContain("from-brand");
    expect(html).toContain("to-brand-coral");
    expect(html).toContain("motion-safe:animate-brillo");
  });

  it("encima de cada hito, la imagen del premio; debajo, su nombre y sus puntos", () => {
    const html = pinta(0);
    for (const [img, puntos] of [
      ["/premios/preguntas.webp", "100"],
      ["/premios/pato480.webp", "340"],
      ["/premios/entrada-mwc.webp", "460"],
    ]) {
      expect(html).toContain(`src="${img}"`);
      expect(html).toContain(`${puntos} pts`);
    }
    expect(html).toContain("10 preguntas extra para el tutor (IA)");
  });

  it("al pasar por encima, cada premio crece (solo con movimiento) y brilla con su color", () => {
    const html = pinta(0);
    const casos: [string, string, string][] = [
      ["/premios/preguntas.webp", "brand", "scale-120"],
      ["/premios/pato480.webp", "promo-cyber-1", "scale-120"],
      ["/premios/entrada-mwc.webp", "promo-navidad", "scale-120"],
      ["/premios/Cohete-ESA.webp", "promo-oro", "scale-140"],
    ];
    for (const [src, color, escala] of casos) {
      const img = imagen(html, src);
      expect(img).toContain(`hover:drop-shadow-[0_0_14px_var(--color-${color})]`);
      expect(img).toContain(`motion-safe:group-hover:${escala}`);
    }
  });

  it("nombre, puntos y botón de los tres premios comparten filas: quedan alineados aunque un nombre ocupe más líneas", () => {
    const html = pinta(350);
    // La lista define tres filas y cada premio las hereda (subgrid) ocupando las tres.
    expect(html).toMatch(/<ul class="[^"]*\bgrid-rows-\[auto_auto_auto\][^"]*">/);
    expect(html.match(/<li class="[^"]*\brow-span-3\b[^"]*\bgrid-rows-subgrid\b/g)).toHaveLength(3);
  });

  it("con 350 puntos se pueden canjear los dos primeros y al tercero le faltan 110", () => {
    const html = pinta(350);
    expect(html.match(/>Canjear</g)).toHaveLength(2);
    expect(html).toContain("Faltan 110");
  });

  it("los premios ya canjeados (de la BBDD) salen como «Canjeado»", () => {
    const html = pinta(250, ["preguntas-tutor"]);
    expect(html).toContain("Canjeado");
    expect(html.match(/>Canjear</g)).toBeNull();
  });

  it("el viaje de la ESA va aparte, con su propia barra hasta 9999", () => {
    const html = pinta(350);
    expect(html).toContain("Misión Leyenda");
    expect(html).toContain('src="/premios/Cohete-ESA.webp"');
    expect(html).toMatch(/aria-valuemax="9999"/);
    expect(html).toContain("Faltan 9649");
  });

  it("los botones «+100 puntos» y «+1000 puntos» van uno al lado del otro y dicen a qué suman", () => {
    const html = pinta(0);
    const fila = html.match(/<div class="flex flex-wrap[^"]*">(<button[\s\S]*?<\/button>){2}<\/div>/)?.[0] ?? "";
    expect(fila).toMatch(/<button[^>]*aria-label="Sumar 100 puntos de demo"[^>]*>[\s\S]*?\+100 puntos<\/button>/);
    expect(fila).toMatch(/<button[^>]*aria-label="Sumar 1000 puntos de demo"[^>]*>[\s\S]*?\+1000 puntos<\/button>/);
    expect(html).not.toContain("(demo)");
  });

  it("no lleva el párrafo de «simulación» en la cabecera", () => {
    expect(pinta(0)).not.toContain("el canje no entrega nada real");
  });
});
