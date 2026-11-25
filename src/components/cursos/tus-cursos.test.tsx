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
  },
];

describe("ListaTusCursos", () => {
  const html = renderToStaticMarkup(<ListaTusCursos cursos={CURSOS} />);

  it("muestra el título de cada curso con el porcentaje escrito", () => {
    expect(html).toContain("Introducción al desarrollo web");
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

  it("cada curso lleva a su página", () => {
    expect(html).toContain('href="/cursos/desarrollo-web"');
    expect(html).toContain('href="/cursos/python-desde-cero"');
  });

  it("solo el curso sin ruta invita a personalizarla", () => {
    expect(html).toContain('href="/cursos/python-desde-cero/ruta"');
    expect(html).not.toContain('href="/cursos/desarrollo-web/ruta"');
    expect(html.split("Personaliza tu ruta").length - 1).toBe(1);
  });
});
