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

describe("ValorarModulos (carrusel)", () => {
  const html = renderToStaticMarkup(<ValorarModulos slug="desarrollo-web" modulos={MODULOS} />);

  it("muestra un módulo cada vez: el primero, con su número", () => {
    expect(html).toContain("Módulo 1 de 2");
    expect(html).toContain(">HTML<");
    expect(html).not.toContain(">CSS<");
  });

  it("la barra de progreso empieza vacía y se puede leer", () => {
    const barra = html.match(/<[^>]*role="progressbar"[^>]*>/)?.[0] ?? "";
    expect(barra).toContain('aria-valuenow="0"');
    expect(html).toContain("0 de 2 respondidos");
  });

  it("pregunta por el módulo con tres respuestas grandes que avanzan al pulsarlas", () => {
    expect(html).toContain("¿Cuánto te interesa HTML?");
    for (const opcion of ["Me interesa mucho", "Me interesa", "Ya lo sé"]) expect(html).toContain(`>${opcion}<`);
    expect([...html.matchAll(/<button[^>]*data-valoracion="[a-z]+"[^>]*>/g)]).toHaveLength(3);
  });

  it("explica qué hace cada respuesta, sin depender del color", () => {
    expect(html).toContain("Lo pondremos de los primeros");
    expect(html).toContain("Lo dejamos para el final");
  });

  it("en el primer módulo no se puede volver atrás", () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Atrás/);
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

  it("celebra que la ruta está lista", () => {
    expect(html).toContain("¡Tu ruta está lista!");
  });

  it("lista los módulos en el nuevo orden, con el recomendado y el que ya conoce marcados con texto", () => {
    expect(html.indexOf("CSS")).toBeLessThan(html.indexOf(">HTML<"));
    expect(html).toMatch(/<ol/);
    expect(html).toContain("Recomendado por tu tutor");
    expect(html).toContain("Ya lo conoces");
  });

  it("ofrece empezar (acción destacada) y cambiar las respuestas", () => {
    expect(html).toMatch(/<a[^>]*href="\/dashboard\/desarrollo-web"[^>]*bg-brand[^>]*>[\s\S]*Empezar|<a[^>]*bg-brand[^>]*href="\/dashboard\/desarrollo-web"/);
    expect(html).toContain("Cambiar mis respuestas");
  });
});
