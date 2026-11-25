import { describe, expect, it } from "vitest";
import { estadoDeModulo, etiquetaEstado, moduloParaSeguir } from "./estado-modulos";
import type { Modulo, Progreso } from "./types";

const modulo = (id: string, ordenSugerido: number): Modulo => ({
  id,
  titulo: id,
  descripcion: "",
  ordenSugerido,
  conceptos: [],
  videos: [],
});
const progreso = (moduloId: string, estado: Progreso["estado"], actualizado: string): Progreso => ({
  alumnoId: "a1",
  moduloId,
  estado,
  aciertosPorConcepto: {},
  actualizado,
});

const modulos = [modulo("m1", 1), modulo("m2", 2), modulo("m3", 3)];

describe("estadoDeModulo", () => {
  it("usa el progreso del módulo y, si no hay, pendiente", () => {
    const p = [progreso("m1", "dominado", "2026-11-23T10:00:00Z")];
    expect(estadoDeModulo("m1", p)).toBe("dominado");
    expect(estadoDeModulo("m2", p)).toBe("pendiente");
  });
});

describe("etiquetaEstado", () => {
  it("da el estado en texto", () => {
    expect(etiquetaEstado("pendiente")).toBe("Sin empezar");
    expect(etiquetaEstado("en_curso")).toBe("En curso");
    expect(etiquetaEstado("dominado")).toBe("Dominado");
    expect(etiquetaEstado("completado")).toBe("Completado");
  });
});

describe("moduloParaSeguir", () => {
  it("elige el módulo en curso tocado más recientemente", () => {
    const p = [
      progreso("m1", "en_curso", "2026-11-23T10:00:00Z"),
      progreso("m3", "en_curso", "2026-11-23T12:00:00Z"),
    ];
    expect(moduloParaSeguir(modulos, p)?.id).toBe("m3");
  });

  it("sin módulos en curso, el primero sin terminar de la ruta sugerida", () => {
    const p = [progreso("m1", "dominado", "2026-11-23T10:00:00Z")];
    expect(moduloParaSeguir(modulos, p)?.id).toBe("m2");
  });

  it("sin progreso, el primero de la ruta", () => {
    expect(moduloParaSeguir(modulos, [])?.id).toBe("m1");
  });

  it("con todo terminado o sin módulos, ninguno", () => {
    const p = modulos.map((m) => progreso(m.id, "completado", "2026-11-23T10:00:00Z"));
    expect(moduloParaSeguir(modulos, p)).toBeUndefined();
    expect(moduloParaSeguir([], [])).toBeUndefined();
  });
});
