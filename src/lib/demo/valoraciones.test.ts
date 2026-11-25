import { describe, expect, it } from "vitest";
import catalogo from "../../../data/catalog.json";
import { construirCatalogos } from "../db/seed/datos";
import type { Catalogo } from "../types";
import { cursosDestacados, esquemaValoracionesDemo, resumenValoraciones, valoracionesDe } from "./valoraciones";
import datos from "./valoraciones.json";

const slugsDelSeed = construirCatalogos(catalogo as Catalogo).map((c) => c.curso.slug);

describe("valoraciones de ejemplo (datos)", () => {
  it("tienen la forma esperada: estrellas de 1 a 5, autor, comentario y fecha", () => {
    expect(esquemaValoracionesDemo.safeParse(datos).success).toBe(true);
  });

  it("solo hay valoraciones de cursos del seed, de 3 a 6 por curso", () => {
    for (const [slug, lista] of Object.entries(datos.valoraciones)) {
      expect(slugsDelSeed).toContain(slug);
      expect(lista.length).toBeGreaterThanOrEqual(3);
      expect(lista.length).toBeLessThanOrEqual(6);
    }
  });

  it("los destacados son 2 o 3 cursos que existen en el seed", () => {
    expect(cursosDestacados.length).toBeGreaterThanOrEqual(2);
    expect(cursosDestacados.length).toBeLessThanOrEqual(3);
    for (const slug of cursosDestacados) expect(slugsDelSeed).toContain(slug);
  });

  it("un curso sin valoraciones devuelve una lista vacía", () => {
    expect(valoracionesDe("no-existe")).toEqual([]);
    expect(valoracionesDe("desarrollo-web").length).toBeGreaterThan(0);
  });

  it("rechaza estrellas fuera de 1–5", () => {
    const mala = { destacados: [], valoraciones: { x: [{ autor: "Ana R.", estrellas: 6, comentario: "Hola", fecha: "2026-10-01" }] } };
    expect(esquemaValoracionesDemo.safeParse(mala).success).toBe(false);
  });
});

describe("resumenValoraciones", () => {
  const v = (estrellas: number) => ({ autor: "Ana R.", estrellas, comentario: "", fecha: "2026-10-01" });

  it("calcula la media con un decimal y el reparto por estrellas (de 5 a 1)", () => {
    const resumen = resumenValoraciones([v(5), v(5), v(4), v(5), v(4)]);
    expect(resumen.media).toBe(4.6);
    expect(resumen.total).toBe(5);
    expect(resumen.distribucion).toEqual([
      { estrellas: 5, cantidad: 3 },
      { estrellas: 4, cantidad: 2 },
      { estrellas: 3, cantidad: 0 },
      { estrellas: 2, cantidad: 0 },
      { estrellas: 1, cantidad: 0 },
    ]);
  });

  it("redondea la media a un decimal", () => {
    expect(resumenValoraciones([v(5), v(4), v(4)]).media).toBe(4.3);
  });

  it("sin valoraciones la media es null", () => {
    expect(resumenValoraciones([])).toMatchObject({ media: null, total: 0 });
  });
});
