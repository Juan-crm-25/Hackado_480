import { describe, expect, it } from "vitest";
import { formatearCaducidad, formatearNumeroTarjeta, marcaTarjeta } from "./tarjeta";

describe("formatearNumeroTarjeta", () => {
  it("agrupa los dígitos de 4 en 4 y quita lo que no es un dígito", () => {
    expect(formatearNumeroTarjeta("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatearNumeroTarjeta("4242-42a4 2")).toBe("4242 4242");
    expect(formatearNumeroTarjeta("")).toBe("");
  });

  it("no pasa de 19 dígitos", () => {
    expect(formatearNumeroTarjeta("1".repeat(25)).replaceAll(" ", "")).toHaveLength(19);
  });
});

describe("formatearCaducidad", () => {
  it("escribe MM/AA mientras se teclea", () => {
    expect(formatearCaducidad("1")).toBe("1");
    expect(formatearCaducidad("12")).toBe("12");
    expect(formatearCaducidad("123")).toBe("12/3");
    expect(formatearCaducidad("1230")).toBe("12/30");
    expect(formatearCaducidad("12/309")).toBe("12/30");
  });
});

describe("marcaTarjeta", () => {
  it("reconoce la marca por los primeros dígitos", () => {
    expect(marcaTarjeta("4242")).toBe("Visa");
    expect(marcaTarjeta("5555 4444")).toBe("Mastercard");
    expect(marcaTarjeta("3782")).toBe("American Express");
    expect(marcaTarjeta("3412")).toBe("American Express");
  });

  it("sin dígitos o con otra marca no dice ninguna", () => {
    expect(marcaTarjeta("")).toBeNull();
    expect(marcaTarjeta("9999")).toBeNull();
  });
});
