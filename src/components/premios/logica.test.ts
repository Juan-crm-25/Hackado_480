import { describe, expect, it } from "vitest";
import { estadoPremio, posicionHito, rellenoBarra } from "./logica";

const HITOS = [100, 340, 460];

describe("barra de premios", () => {
  it("los hitos van repartidos por igual, centrados en su columna (no a escala de puntos)", () => {
    const posiciones = HITOS.map((_, i) => posicionHito(i, HITOS.length));
    [100 / 6, 50, 500 / 6].forEach((esperada, i) => expect(posiciones[i]).toBeCloseTo(esperada));
  });

  it("el relleno avanza por tramos: de 0 al primer hito, y entre cada hito y el siguiente", () => {
    expect(rellenoBarra(0, HITOS)).toBe(0);
    expect(rellenoBarra(50, HITOS)).toBeCloseTo(100 / 12); // mitad del primer tramo
    expect(rellenoBarra(100, HITOS)).toBeCloseTo(100 / 6); // justo en el primer hito
    expect(rellenoBarra(220, HITOS)).toBeCloseTo((100 / 6 + 50) / 2); // mitad entre 100 y 340
    expect(rellenoBarra(460, HITOS)).toBeCloseTo(500 / 6); // en el último hito
  });

  it("pasado el último hito, la barra se llena entera", () => {
    expect(rellenoBarra(461, HITOS)).toBe(100);
    expect(rellenoBarra(5000, HITOS)).toBe(100);
  });

  it("puntos negativos o inválidos cuentan como 0", () => {
    expect(rellenoBarra(-10, HITOS)).toBe(0);
    expect(rellenoBarra(Number.NaN, HITOS)).toBe(0);
  });
});

describe("estado de cada premio", () => {
  const premio = { id: "pato-480", puntos: 340 };

  it("bloqueado mientras el saldo no llega, con los puntos que faltan", () => {
    expect(estadoPremio(300, premio, new Set())).toEqual({ tipo: "bloqueado", faltan: 40 });
  });

  it("disponible al llegar justo a los puntos", () => {
    expect(estadoPremio(340, premio, new Set())).toEqual({ tipo: "disponible" });
  });

  it("canjeado si ya lo has canjeado, aunque tengas más puntos", () => {
    expect(estadoPremio(9000, premio, new Set(["pato-480"]))).toEqual({ tipo: "canjeado" });
  });
});
