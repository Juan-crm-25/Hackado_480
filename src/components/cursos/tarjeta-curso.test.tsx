import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TarjetaCurso, type CursoConValoracion } from "./tarjeta-curso";

const CURSO: CursoConValoracion = {
  slug: "python-desde-cero",
  titulo: "Python desde cero",
  descripcion: "Aprende a programar",
  categoria: { slug: "programacion", nombre: "Programación" },
  precioCentimos: 4900,
  numModulos: 3,
  numAlumnos: 7,
  bannerUrl: "/banners/python-desde-cero.webp",
  valoracion: { media: 4.6, total: 12 },
};

describe("TarjetaCurso", () => {
  it("con banner muestra la imagen en lugar del título; el título queda como texto alternativo del enlace", () => {
    const html = renderToStaticMarkup(<TarjetaCurso curso={CURSO} />);
    const img = html.match(/<img[^>]*>/)?.[0] ?? "";
    expect(img).toContain('alt="Python desde cero"');
    expect(img).toContain("python-desde-cero.webp");
    expect(html).toMatch(/<h3[^>]*><a[^>]*href="\/cursos\/python-desde-cero"[^>]*><img/);
    // El título no aparece como texto visible aparte (solo en el alt).
    expect(html.replace(/alt="[^"]*"/g, "")).not.toContain("Python desde cero");
  });

  it("sin banner muestra el título como siempre", () => {
    const html = renderToStaticMarkup(<TarjetaCurso curso={{ ...CURSO, bannerUrl: null }} />);
    expect(html).not.toContain("<img");
    expect(html).toMatch(/<a[^>]*href="\/cursos\/python-desde-cero"[^>]*>Python desde cero<\/a>/);
  });

  it("con o sin banner mantiene la categoría, el precio y los datos del curso", () => {
    for (const curso of [CURSO, { ...CURSO, bannerUrl: null }]) {
      const html = renderToStaticMarkup(<TarjetaCurso curso={curso} />);
      expect(html).toContain("Programación");
      expect(html).toContain("49,00");
      expect(html).toContain("Aprende a programar");
    }
  });
});
