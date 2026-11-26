import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EsqueletoCatalogo, EsqueletoCursoAlumno, EsqueletoTusCursos } from "./esqueletos";

const CASOS = [
  { nombre: "catálogo de la home", html: renderToStaticMarkup(<EsqueletoCatalogo />), texto: "Cargando los cursos…", tarjetas: 6 },
  { nombre: "«Tus cursos»", html: renderToStaticMarkup(<EsqueletoTusCursos />), texto: "Cargando tus cursos…", tarjetas: 2 },
  { nombre: "curso del alumno", html: renderToStaticMarkup(<EsqueletoCursoAlumno />), texto: "Cargando el curso…", tarjetas: 3 },
];

describe.each(CASOS)("esqueleto del $nombre", ({ html, texto, tarjetas }) => {
  it("anuncia la carga con texto solo para lectores de pantalla", () => {
    expect(html).toMatch(new RegExp(`<p role="status" class="sr-only">${texto}</p>`));
  });

  it("los bloques son decorativos y solo laten si el usuario acepta animaciones", () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).not.toMatch(/(?<!:)animate-pulse/);
  });

  it("pinta tantas tarjetas como suele haber, con la misma rejilla que el contenido", () => {
    expect(html.match(/<li/g)).toHaveLength(tarjetas);
  });
});

it("el catálogo deja sitio al buscador y al filtro de categoría", () => {
  const html = renderToStaticMarkup(<EsqueletoCatalogo />);
  expect(html.match(/h-11/g)?.length).toBeGreaterThanOrEqual(2);
  expect(html).toContain("lg:grid-cols-3");
});
