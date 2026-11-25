import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { RespuestaRuta } from "@/lib/ruta";
import { ResultadoRuta } from "./resultado-ruta";
import { ValorarModulos } from "./valorar-modulos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const MODULOS = [
  { id: "m1-html", titulo: "HTML", descripcion: "Estructura" },
  { id: "m2-css", titulo: "CSS", descripcion: "Estilos" },
];

describe("ValorarModulos", () => {
  const html = renderToStaticMarkup(<ValorarModulos slug="desarrollo-web" modulos={MODULOS} />);

  it("muestra cada módulo con las tres opciones", () => {
    expect(html).toContain("HTML");
    expect(html).toContain("CSS");
    for (const opcion of ["Me interesa mucho", "Me interesa", "Ya lo sé"]) {
      expect(html.split(`>${opcion}<`).length - 1).toBe(2);
    }
  });

  it("«Me interesa» viene marcada por defecto en todos los módulos", () => {
    const pulsados = [...html.matchAll(/<button[^>]*aria-pressed="true"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(pulsados).toEqual(["Me interesa", "Me interesa"]);
  });

  it("cada grupo de opciones lleva el nombre de su módulo para el lector de pantalla", () => {
    expect(html).toContain('aria-label="¿Cuánto te interesa HTML?"');
    expect(html).toContain('aria-label="¿Cuánto te interesa CSS?"');
  });

  it("tiene el botón «Ver mi ruta» como acción destacada", () => {
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*bg-brand[^>]*>[\s\S]*Ver mi ruta/);
  });
});

describe("ResultadoRuta", () => {
  const resultado: RespuestaRuta = {
    curso: { slug: "desarrollo-web", titulo: "Introducción al desarrollo web" },
    principal: "m2-css",
    modulos: [
      { id: "m2-css", titulo: "CSS", descripcion: "Estilos", valoracion: "mucho" },
      { id: "m1-html", titulo: "HTML", descripcion: "Estructura", valoracion: "sabe" },
    ],
    recomendacion: ["Empezamos por «CSS» porque es lo que más te interesa.", "Nada queda bloqueado."],
  };
  const html = renderToStaticMarkup(<ResultadoRuta resultado={resultado} onCambiar={vi.fn()} />);

  it("muestra la recomendación como mensaje del tutor", () => {
    expect(html).toContain("Tu tutor te recomienda");
    expect(html).toContain("Empezamos por «CSS» porque es lo que más te interesa.");
    expect(html).toContain("Nada queda bloqueado.");
  });

  it("lista los módulos en el nuevo orden, con el recomendado y el que ya domina marcados con texto", () => {
    expect(html.indexOf("CSS")).toBeLessThan(html.indexOf(">HTML<"));
    expect(html).toMatch(/<ol/);
    expect(html).toContain("Recomendado por tu tutor");
    expect(html).toContain("Ya lo dominas");
  });

  it("ofrece empezar (acción destacada) y cambiar las respuestas", () => {
    expect(html).toMatch(/<a[^>]*href="\/dashboard"[^>]*bg-brand[^>]*>[\s\S]*Empezar|<a[^>]*bg-brand[^>]*href="\/dashboard"/);
    expect(html).toContain("Cambiar mis respuestas");
  });
});
