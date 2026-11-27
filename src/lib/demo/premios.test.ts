import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PREMIOS } from "./premios";

describe("premios de ejemplo (canje simulado del perfil)", () => {
  it("son cuatro, en orden: preguntas del tutor, pato de 480, entradas del MWC y el viaje de la ESA", () => {
    expect(PREMIOS.map((p) => [p.id, p.puntos])).toEqual([
      ["preguntas-tutor", 100],
      ["pato-480", 340],
      ["entradas-mwc", 460],
      ["viaje-esa", 9999],
    ]);
  });

  it("solo el viaje de la ESA es legendario (va separado en la barra)", () => {
    expect(PREMIOS.filter((p) => p.legendario).map((p) => p.id)).toEqual(["viaje-esa"]);
  });

  it("cada premio tiene nombre, descripción y una imagen que existe en public/", () => {
    for (const p of PREMIOS) {
      expect(p.nombre.length).toBeGreaterThan(0);
      expect(p.descripcion.length).toBeGreaterThan(0);
      expect(existsSync(join(__dirname, "../../../public", p.imagen))).toBe(true);
    }
  });
});
