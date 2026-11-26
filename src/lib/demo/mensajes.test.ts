import { describe, expect, it } from "vitest";
import { conversacionesDemo, totalNoLeidos } from "./mensajes";

describe("bandeja de mensajes de ejemplo", () => {
  it("tiene entre 2 y 3 conversaciones, entre ellas la profesora y el equipo de 480 Academy", () => {
    expect(conversacionesDemo.length).toBeGreaterThanOrEqual(2);
    expect(conversacionesDemo.length).toBeLessThanOrEqual(3);
    const nombres = conversacionesDemo.map((c) => c.nombre);
    expect(nombres).toContain("Ana Torres");
    expect(nombres).toContain("Equipo 480 Academy");
  });

  it("cada conversación tiene algún mensaje, con texto y hora", () => {
    for (const c of conversacionesDemo) {
      expect(c.mensajes.length).toBeGreaterThan(0);
      for (const m of c.mensajes) {
        expect(m.texto.length).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(m.hora))).toBe(false);
      }
    }
  });

  it("cuenta los no leídos de todas las conversaciones", () => {
    expect(totalNoLeidos(conversacionesDemo)).toBeGreaterThan(0);
    expect(totalNoLeidos([])).toBe(0);
  });
});
