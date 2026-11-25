import { describe, expect, it } from "vitest";
import { aplicarOrden, ordenarRuta, recomendacionTutor } from "./ruta";

const MODULOS = [
  { id: "html", titulo: "HTML", ordenSugerido: 1 },
  { id: "css", titulo: "CSS", ordenSugerido: 2 },
  { id: "responsive", titulo: "Responsive", ordenSugerido: 3 },
  { id: "js", titulo: "JavaScript", ordenSugerido: 4 },
];
const ids = (modulos: { id: string }[]) => modulos.map((m) => m.id);

describe("ordenarRuta", () => {
  it("pone primero lo que interesa mucho, después lo que interesa y al final lo que ya sabe", () => {
    const { orden, principal } = ordenarRuta(MODULOS, { js: "mucho", html: "sabe", css: "interesa", responsive: "interesa" });
    expect(ids(orden)).toEqual(["js", "css", "responsive", "html"]);
    expect(principal?.id).toBe("js");
  });

  it("los empates siguen el orden sugerido del profesor", () => {
    const { orden } = ordenarRuta(MODULOS, { js: "mucho", css: "mucho" });
    expect(ids(orden)).toEqual(["css", "js", "html", "responsive"]);
  });

  it("un módulo sin valorar cuenta como «Me interesa»", () => {
    const { orden } = ordenarRuta(MODULOS, { css: "sabe" });
    expect(ids(orden)).toEqual(["html", "responsive", "js", "css"]);
  });

  it("si ya lo sabe todo, mantiene el orden del profesor", () => {
    const todo = Object.fromEntries(MODULOS.map((m) => [m.id, "sabe" as const]));
    const { orden, principal } = ordenarRuta(MODULOS, todo);
    expect(ids(orden)).toEqual(["html", "css", "responsive", "js"]);
    expect(principal?.id).toBe("html");
  });

  it("un módulo llamado como una propiedad de objeto («constructor») cuenta como «Me interesa»", () => {
    const raros = [
      { id: "constructor", titulo: "Constructor", ordenSugerido: 2 },
      { id: "a", titulo: "A", ordenSugerido: 1 },
    ];
    const { orden } = ordenarRuta(raros, { a: "sabe" });
    expect(ids(orden)).toEqual(["constructor", "a"]);
  });

  it("sin módulos no hay principal", () => {
    expect(ordenarRuta([], {})).toEqual({ orden: [], principal: null });
  });
});

describe("aplicarOrden", () => {
  it("ordena los módulos según la ruta guardada", () => {
    expect(ids(aplicarOrden(MODULOS, ["js", "css", "html", "responsive"]))).toEqual(["js", "css", "html", "responsive"]);
  });

  it("sin ruta deja el orden del profesor", () => {
    expect(ids(aplicarOrden(MODULOS, null))).toEqual(["html", "css", "responsive", "js"]);
  });

  it("los módulos que no están en la ruta (nuevos) van al final en su orden; los ids desconocidos se ignoran", () => {
    expect(ids(aplicarOrden(MODULOS, ["js", "borrado", "css"]))).toEqual(["js", "css", "html", "responsive"]);
  });
});

describe("recomendacionTutor", () => {
  it("explica por qué empieza por el módulo principal y por qué deja al final lo que ya sabe", () => {
    const { orden } = ordenarRuta(MODULOS, { css: "mucho", js: "mucho", html: "sabe", responsive: "sabe" });
    const texto = recomendacionTutor(orden, { css: "mucho", js: "mucho", html: "sabe", responsive: "sabe" });
    expect(texto).toEqual([
      "Empezamos por «CSS» porque es lo que más te interesa.",
      "Después seguimos con «JavaScript», que también te interesa mucho.",
      "«HTML» y «Responsive» los dejamos para el final porque ya los conoces. Cuando quieras, haz su test para marcarlos como dominados.",
      "Nada queda bloqueado: puedes abrir cualquier módulo cuando quieras.",
    ]);
  });

  it("si nada destaca, empieza por el primer módulo de su ruta", () => {
    const { orden } = ordenarRuta(MODULOS, {});
    expect(recomendacionTutor(orden, {})[0]).toBe("Empezamos por «HTML»: es el primer módulo de tu ruta.");
  });

  it("si el primer módulo del curso ya lo sabe, no lo llama «primer paso del curso»", () => {
    const { orden } = ordenarRuta(MODULOS, { html: "sabe" });
    expect(recomendacionTutor(orden, { html: "sabe" })[0]).toBe("Empezamos por «CSS»: es el primer módulo de tu ruta.");
  });

  it("un solo módulo dominado va en singular", () => {
    const { orden } = ordenarRuta(MODULOS, { html: "sabe" });
    expect(recomendacionTutor(orden, { html: "sabe" })).toContain(
      "«HTML» lo dejamos para el final porque ya lo conoces. Cuando quieras, haz su test para marcarlo como dominado.",
    );
  });

  it("si ya lo sabe todo, propone repasar en el orden del curso", () => {
    const todo = Object.fromEntries(MODULOS.map((m) => [m.id, "sabe" as const]));
    const { orden } = ordenarRuta(MODULOS, todo);
    expect(recomendacionTutor(orden, todo)[0]).toBe(
      "Parece que ya conoces todo el curso. Te propongo repasarlo en su orden original y hacer el test de cada módulo para marcarlo como dominado.",
    );
  });
});
