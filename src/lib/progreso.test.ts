import { describe, expect, it } from "vitest";
import { porcentajeCompletado } from "./progreso";

describe("porcentajeCompletado", () => {
  it("es la parte de módulos completados, redondeada a un entero", () => {
    expect(porcentajeCompletado(1, 4)).toBe(25);
    expect(porcentajeCompletado(1, 3)).toBe(33);
    expect(porcentajeCompletado(2, 3)).toBe(67);
    expect(porcentajeCompletado(4, 4)).toBe(100);
  });

  it("un curso sin módulos o sin nada completado está al 0 %", () => {
    expect(porcentajeCompletado(0, 0)).toBe(0);
    expect(porcentajeCompletado(0, 5)).toBe(0);
  });

  it("nunca pasa de 100 ni baja de 0", () => {
    expect(porcentajeCompletado(5, 4)).toBe(100);
    expect(porcentajeCompletado(-1, 4)).toBe(0);
  });
});
