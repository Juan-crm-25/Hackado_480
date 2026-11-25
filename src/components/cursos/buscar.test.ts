import { describe, expect, it } from "vitest";
import { categoriasDe, filtrarCursos, normalizar } from "./buscar";

const cursos = [
  { slug: "python", titulo: "Python desde cero", descripcion: "Aprende a programar", categoria: { slug: "programacion", nombre: "Programación" } },
  { slug: "cocina", titulo: "Cocina mediterránea", descripcion: "Recetas sanas", categoria: { slug: "cocina", nombre: "Cocina" } },
  { slug: "ia", titulo: "IA generativa", descripcion: "Usa la inteligencia artificial", categoria: { slug: "ia", nombre: "IA" } },
];

describe("normalizar", () => {
  it("quita tildes, mayúsculas y espacios de más", () => {
    expect(normalizar("  Mediterránea  ÁÉÍÓÚ Ñ ")).toBe("mediterranea aeiou n");
  });
});

describe("filtrarCursos", () => {
  it("sin texto ni categoría devuelve todos en el mismo orden", () => {
    expect(filtrarCursos(cursos, { texto: "", categoria: null }).map((c) => c.slug)).toEqual(["python", "cocina", "ia"]);
  });

  it("busca sin tener en cuenta tildes ni mayúsculas en el título", () => {
    expect(filtrarCursos(cursos, { texto: "MEDITERRANEA", categoria: null }).map((c) => c.slug)).toEqual(["cocina"]);
  });

  it("busca también en la descripción y en la categoría", () => {
    expect(filtrarCursos(cursos, { texto: "recetas", categoria: null }).map((c) => c.slug)).toEqual(["cocina"]);
    expect(filtrarCursos(cursos, { texto: "programación", categoria: null }).map((c) => c.slug)).toEqual(["python"]);
  });

  it("filtra por el slug de la categoría y combina con el texto", () => {
    expect(filtrarCursos(cursos, { texto: "", categoria: "ia" }).map((c) => c.slug)).toEqual(["ia"]);
    expect(filtrarCursos(cursos, { texto: "python", categoria: "ia" })).toEqual([]);
  });
});

describe("categoriasDe", () => {
  it("devuelve las categorías sin repetir, ordenadas por nombre", () => {
    expect(categoriasDe([...cursos, cursos[0]])).toEqual([
      { slug: "cocina", nombre: "Cocina" },
      { slug: "ia", nombre: "IA" },
      { slug: "programacion", nombre: "Programación" },
    ]);
  });
});
