import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListaTusCursos } from "./tus-cursos";

const CURSOS = [
  {
    slug: "desarrollo-web",
    titulo: "Introducción al desarrollo web",
    categoria: "Programación",
    rolEnCurso: "alumno" as const,
    totalModulos: 4,
    modulosCompletados: 1,
    porcentaje: 25,
    personalizada: true,
    bannerUrl: "/banners/desarrollo-web.webp",
  },
  {
    slug: "python-desde-cero",
    titulo: "Python desde cero",
    categoria: "Programación",
    rolEnCurso: "alumno" as const,
    totalModulos: 3,
    modulosCompletados: 0,
    porcentaje: 0,
    personalizada: false,
    bannerUrl: null,
  },
];

describe("ListaTusCursos", () => {
  const html = renderToStaticMarkup(<ListaTusCursos cursos={CURSOS} />);

  it("el curso con banner muestra la imagen (con el título como texto alternativo) y no el título visible", () => {
    expect(html).toMatch(/<img[^>]*alt="Introducción al desarrollo web"/);
    expect(html).not.toMatch(/<h3[^>]*>Introducción al desarrollo web<\/h3>/);
  });

  it("el curso sin banner muestra su título", () => {
    expect(html).toMatch(/<h3[^>]*>Python desde cero<\/h3>/);
  });

  it("muestra el porcentaje escrito de cada curso", () => {
    expect(html).toContain("25 % completado");
    expect(html).toContain("Python desde cero");
    expect(html).toContain("0 % completado");
    expect(html).toContain("1 de 4 módulos");
  });

  it("cada barra es un progressbar accesible con su valor", () => {
    const barras = [...html.matchAll(/<[^>]*role="progressbar"[^>]*>/g)].map((m) => m[0]);
    expect(barras).toHaveLength(2);
    expect(barras[0]).toContain('aria-valuenow="25"');
    expect(barras[1]).toContain('aria-valuenow="0"');
  });

  it("cada curso entra directamente al curso del alumno, no a su ficha de tienda", () => {
    expect(html).toContain('href="/dashboard/desarrollo-web"');
    expect(html).toContain('href="/dashboard/python-desde-cero"');
    expect(html).not.toContain('href="/cursos/desarrollo-web"');
  });

  it("solo el curso sin ruta invita a personalizarla", () => {
    expect(html).toContain('href="/cursos/python-desde-cero/ruta"');
    expect(html).not.toContain('href="/cursos/desarrollo-web/ruta"');
    expect(html.split("Personaliza tu ruta").length - 1).toBe(1);
  });
});
