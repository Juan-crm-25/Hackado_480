import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumirConsulta, reiniciarLimites } from "./limite";

describe("límite diario", () => {
  beforeEach(() => {
    reiniciarLimites();
    vi.stubEnv("AI_LIMITE_DIARIO", "2");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("deja hacer consultas hasta el límite y luego las bloquea", () => {
    expect(consumirConsulta("a1")).toEqual({ permitido: true, restantes: 1 });
    expect(consumirConsulta("a1")).toEqual({ permitido: true, restantes: 0 });
    expect(consumirConsulta("a1")).toEqual({ permitido: false, restantes: 0 });
  });

  it("cuenta por separado a cada alumno", () => {
    consumirConsulta("a1");
    consumirConsulta("a1");
    expect(consumirConsulta("a2").permitido).toBe(true);
  });

  it("se reinicia al día siguiente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-24T10:00:00Z"));
    consumirConsulta("a1");
    consumirConsulta("a1");
    expect(consumirConsulta("a1").permitido).toBe(false);

    vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
    expect(consumirConsulta("a1").permitido).toBe(true);
  });
});
