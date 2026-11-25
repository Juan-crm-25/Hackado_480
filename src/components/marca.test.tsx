import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Marca, PALABRAS_MARCA, siguientePalabra } from "./marca";

const sinEtiquetas = (html: string) => html.replace(/<[^>]+>/g, "");

describe("Marca (palabras que rotan)", () => {
  const html = renderToStaticMarkup(<Marca />);

  it("se lee siempre como «480 Academy»: las palabras que rotan son decorativas", () => {
    expect(html).toContain('<span class="sr-only">480 Academy</span>');
    const visual = html.match(/<span[^>]*data-rotacion[^>]*>/)?.[0] ?? "";
    expect(visual).toContain('aria-hidden="true"');
  });

  it("rota entre 480_Academy, learnby_dō y hackan_dō, cada guion con su color", () => {
    expect(PALABRAS_MARCA.map((p) => `${p.antes}_${p.despues}`)).toEqual(["480_Academy", "learnby_dō", "hackan_dō"]);
    expect(PALABRAS_MARCA.map((p) => p.guion)).toEqual(["bg-brand", "bg-brand-cyan", "bg-brand-coral"]);
    for (const p of PALABRAS_MARCA) {
      expect(html).toContain(p.antes);
      expect(html).toContain(p.despues);
      expect(html).toContain(p.guion);
    }
  });

  it("empieza mostrando 480_Academy y oculta las demás", () => {
    const palabras = [...html.matchAll(/<span[^>]*data-palabra="(\d)"[^>]*>/g)];
    expect(palabras).toHaveLength(3);
    expect(palabras[0][0]).toContain("opacity-100");
    expect(palabras[1][0]).toContain("opacity-0");
    expect(palabras[2][0]).toContain("opacity-0");
  });

  it("el guion ya no cambia de color por su cuenta y el movimiento solo va con motion-safe", () => {
    expect(html).not.toContain("animate-marca");
    expect(html).toContain("motion-safe:transition");
  });

  it("solo el texto visible y el de lectores de pantalla, sin nada más", () => {
    expect(sinEtiquetas(html)).toBe("480 Academy480Academylearnbydōhackandō");
  });
});

describe("siguientePalabra", () => {
  it("pasa a la siguiente y vuelve a la primera al final", () => {
    expect(siguientePalabra(0, 3)).toBe(1);
    expect(siguientePalabra(1, 3)).toBe(2);
    expect(siguientePalabra(2, 3)).toBe(0);
  });
});
