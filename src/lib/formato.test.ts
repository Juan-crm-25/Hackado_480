import { describe, expect, it } from "vitest";
import { contar, formatoDecimal, formatoPrecio } from "./formato";

describe("formatoPrecio", () => {
  it("un curso de 0 céntimos es «Gratis»", () => {
    expect(formatoPrecio(0)).toBe("Gratis");
  });

  it("formatea los céntimos en euros al estilo español", () => {
    expect(formatoPrecio(4900)).toBe("49,00\u00a0€");
    expect(formatoPrecio(1990)).toBe("19,90\u00a0€");
    expect(formatoPrecio(123456)).toBe("1234,56\u00a0€");
  });
});

describe("formatoDecimal", () => {
  it("usa coma decimal y una cifra", () => {
    expect(formatoDecimal(4.6)).toBe("4,6");
    expect(formatoDecimal(4)).toBe("4,0");
    expect(formatoDecimal(4.25)).toBe("4,3");
  });
});

describe("contar", () => {
  it("el número con la palabra en singular solo si es 1", () => {
    expect(contar(1, "pregunta", "preguntas")).toBe("1 pregunta");
    expect(contar(0, "pregunta", "preguntas")).toBe("0 preguntas");
    expect(contar(12, "alumno", "alumnos")).toBe("12 alumnos");
  });
});
