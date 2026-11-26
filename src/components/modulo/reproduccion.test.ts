import { describe, expect, it } from "vitest";
import {
  acumularReproduccion,
  alcanzaVisto,
  alternarAbierta,
  REPRODUCCION_INICIAL,
  textoContador,
  type EstadoReproduccion,
} from "./reproduccion";

const reproducir = { tipo: "estado", reproduciendo: true } as const;
const pausar = { tipo: "estado", reproduciendo: false } as const;
const tick = { tipo: "tick" } as const;

/** Reproduce desde t=0 y da un tick por segundo hasta `segundos`. */
function reproducirDurante(segundos: number): EstadoReproduccion {
  let estado = acumularReproduccion(REPRODUCCION_INICIAL, reproducir, 0);
  for (let s = 1; s <= segundos; s++) estado = acumularReproduccion(estado, tick, s * 1000);
  return estado;
}

describe("acumularReproduccion", () => {
  it("solo cuenta el tiempo mientras se reproduce", () => {
    let estado = acumularReproduccion(REPRODUCCION_INICIAL, tick, 5000);
    expect(estado.segundos).toBe(0);
    estado = acumularReproduccion(estado, reproducir, 10_000);
    estado = acumularReproduccion(estado, tick, 11_000);
    estado = acumularReproduccion(estado, pausar, 11_500);
    expect(estado.segundos).toBeCloseTo(1.5);
    estado = acumularReproduccion(estado, tick, 60_000);
    expect(estado.segundos).toBeCloseTo(1.5);
    expect(estado.reproduciendo).toBe(false);
  });

  it("no cuenta los saltos grandes (pestaña dormida, reloj): como mucho 2 s por paso", () => {
    let estado = acumularReproduccion(REPRODUCCION_INICIAL, reproducir, 0);
    estado = acumularReproduccion(estado, tick, 30_000);
    expect(estado.segundos).toBe(2);
    estado = acumularReproduccion(estado, tick, 29_000);
    expect(estado.segundos).toBe(2);
  });

  it("llega a «visto» justo a los 15 s, no antes", () => {
    expect(alcanzaVisto(reproducirDurante(14))).toBe(false);
    expect(alcanzaVisto(reproducirDurante(15))).toBe(true);
    expect(alcanzaVisto(REPRODUCCION_INICIAL)).toBe(false);
  });
});

describe("textoContador", () => {
  it("muestra los segundos enteros de 15 y no pasa de 15", () => {
    expect(textoContador(9.7)).toBe("Viendo… 9 s de 15");
    expect(textoContador(0)).toBe("Viendo… 0 s de 15");
    expect(textoContador(40)).toBe("Viendo… 15 s de 15");
  });
});

describe("alternarAbierta", () => {
  it("abre y cierra filas sin tocar nada más", () => {
    const abierta = alternarAbierta(new Set(), "c1");
    expect([...abierta]).toEqual(["c1"]);
    expect([...alternarAbierta(abierta, "c1")]).toEqual([]);
  });
});
