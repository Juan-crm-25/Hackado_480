import { describe, expect, it } from "vitest";
import {
  NOTA_APROBADO,
  PREGUNTAS_MAXIMAS,
  PREGUNTAS_MINIMAS,
  aciertosPorConcepto,
  calcularNota,
  elegirPreguntas,
  estadoTrasTest,
} from "./test-modulo";

/** Generador de números «al azar» que se repite: así el test siempre elige lo mismo. */
function azarFijo(semilla = 1) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const banco = (porConcepto: Record<string, number>) =>
  Object.entries(porConcepto).flatMap(([conceptoId, n]) => Array.from({ length: n }, (_, i) => ({ id: `${conceptoId}-${i}`, conceptoId })));

describe("elegirPreguntas", () => {
  it(`elige ${PREGUNTAS_MAXIMAS} como mucho, sin repetir, y al menos una de cada concepto`, () => {
    const elegidas = elegirPreguntas(banco({ a: 3, b: 3, c: 3 }), azarFijo());
    expect(elegidas).toHaveLength(PREGUNTAS_MAXIMAS);
    expect(new Set(elegidas.map((e) => e.id)).size).toBe(PREGUNTAS_MAXIMAS);
    expect(new Set(elegidas.map((e) => e.conceptoId))).toEqual(new Set(["a", "b", "c"]));
  });

  it("un concepto con una sola pregunta también sale", () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      const elegidas = elegirPreguntas(banco({ a: 6, b: 6, c: 1 }), azarFijo(semilla));
      expect(elegidas.some((e) => e.conceptoId === "c")).toBe(true);
    }
  });

  it("cambia según el azar (no siempre las mismas ni en el mismo orden)", () => {
    const ids = (semilla: number) => elegirPreguntas(banco({ a: 3, b: 3, c: 3 }), azarFijo(semilla)).map((e) => e.id).join();
    expect(new Set([1, 2, 3, 4, 5].map(ids)).size).toBeGreaterThan(1);
  });

  it(`con ${PREGUNTAS_MINIMAS} a ${PREGUNTAS_MAXIMAS} en el banco las usa todas; con menos de ${PREGUNTAS_MINIMAS}, ninguna`, () => {
    expect(elegirPreguntas(banco({ a: 3, b: 2 }), azarFijo())).toHaveLength(5);
    expect(elegirPreguntas(banco({ a: 2, b: 2 }), azarFijo())).toEqual([]);
  });
});

describe("calcularNota", () => {
  it("es la media de las puntuaciones sobre 10, con dos decimales", () => {
    expect(calcularNota([1, 1, 1, 1, 1])).toBe(10);
    expect(calcularNota([1, 1, 1, 0.5, 0, 1])).toBe(7.5);
    expect(calcularNota([1, 0, 0])).toBe(3.33);
    expect(calcularNota([])).toBe(0);
  });

  it(`se aprueba con un ${NOTA_APROBADO}`, () => {
    expect(NOTA_APROBADO).toBe(7);
  });
});

describe("estadoTrasTest", () => {
  it("aprobado: el módulo queda completado, venga de donde venga", () => {
    for (const antes of [null, "pendiente", "en_curso", "dominado", "completado"] as const) {
      expect(estadoTrasTest(antes, true)).toBe("completado");
    }
  });

  it("suspendido: nunca baja de estado (cuenta el mejor intento); si no había empezado, queda en curso", () => {
    expect(estadoTrasTest(null, false)).toBe("en_curso");
    expect(estadoTrasTest("pendiente", false)).toBe("en_curso");
    expect(estadoTrasTest("en_curso", false)).toBe("en_curso");
    expect(estadoTrasTest("dominado", false)).toBe("dominado");
    expect(estadoTrasTest("completado", false)).toBe("completado");
  });
});

describe("aciertosPorConcepto", () => {
  it("es la media de puntuación de cada concepto, de 0 a 1", () => {
    expect(
      aciertosPorConcepto([
        { conceptoId: "a", puntuacion: 1 },
        { conceptoId: "a", puntuacion: 0 },
        { conceptoId: "b", puntuacion: 0.5 },
        { conceptoId: "a", puntuacion: 1 },
      ]),
    ).toEqual({ a: 0.67, b: 0.5 });
  });
});
