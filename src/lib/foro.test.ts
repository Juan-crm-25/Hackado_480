import { describe, expect, it } from "vitest";
import { calcularPuntosRespuestas, type ComentarioPuntuable, type ValidacionForo } from "./foro";

/** Comentarios en orden: el n-ésimo se crea n minutos después del primero. */
function hilo(...filas: [autorId: string, validacion: ValidacionForo][]): ComentarioPuntuable[] {
  return filas.map(([autorId, validacion], i) => ({
    id: `c${i + 1}`,
    autorId,
    validacion,
    creado: new Date(Date.UTC(2026, 10, 20, 10, i)),
  }));
}

const puntos = (comentarios: ComentarioPuntuable[]) => {
  const mapa = calcularPuntosRespuestas(comentarios);
  return comentarios.map((c) => mapa.get(c.id));
};

describe("calcularPuntosRespuestas (S12)", () => {
  it("solo las 3 primeras respuestas correctas de personas distintas dan +10; la cuarta da 0", () => {
    expect(puntos(hilo(["ana", "correcta"], ["luis", "correcta"], ["eva", "correcta"], ["pau", "correcta"]))).toEqual([10, 10, 10, 0]);
  });

  it("una persona gana puntos una vez por tema: su segunda respuesta correcta da 0", () => {
    expect(puntos(hilo(["ana", "correcta"], ["ana", "correcta"], ["ana", "aproximada"]))).toEqual([10, 0, 0]);
  });

  it("aproximada y luego correcta de la misma persona: +5 y luego 0", () => {
    expect(puntos(hilo(["ana", "aproximada"], ["ana", "correcta"]))).toEqual([5, 0]);
  });

  it("la correcta de la misma persona que ya ganó no ocupa hueco entre las 3 primeras", () => {
    expect(puntos(hilo(["ana", "aproximada"], ["ana", "correcta"], ["luis", "correcta"], ["eva", "correcta"], ["pau", "correcta"]))).toEqual([
      5, 0, 10, 10, 10,
    ]);
  });

  it("una correcta fuera de las 3 primeras no gasta su vez: una aproximada suya después da +5", () => {
    expect(puntos(hilo(["ana", "correcta"], ["luis", "correcta"], ["eva", "correcta"], ["pau", "correcta"], ["pau", "aproximada"]))).toEqual([
      10, 10, 10, 0, 5,
    ]);
  });

  it("las aproximadas no tienen tope de personas", () => {
    expect(puntos(hilo(["ana", "aproximada"], ["luis", "aproximada"], ["eva", "aproximada"], ["pau", "aproximada"]))).toEqual([5, 5, 5, 5]);
  });

  it("incorrecta, no_respuesta y pendiente dan 0 y no gastan la vez de nadie", () => {
    expect(
      puntos(hilo(["ana", "incorrecta"], ["ana", "no_respuesta"], ["ana", "pendiente"], ["ana", "correcta"], ["luis", "pendiente"], ["luis", "aproximada"])),
    ).toEqual([0, 0, 0, 10, 0, 5]);
  });

  it("sigue el orden de creación (no el de la lista) y, si empatan, el id", () => {
    const mismoMomento = new Date(Date.UTC(2026, 10, 20, 10, 0));
    const antes = new Date(Date.UTC(2026, 10, 20, 9, 0));
    const comentarios: ComentarioPuntuable[] = [
      { id: "c4", autorId: "pau", validacion: "correcta", creado: mismoMomento },
      { id: "c3", autorId: "eva", validacion: "correcta", creado: mismoMomento },
      { id: "c2", autorId: "luis", validacion: "correcta", creado: mismoMomento },
      { id: "c1", autorId: "ana", validacion: "correcta", creado: antes },
    ];
    const mapa = calcularPuntosRespuestas(comentarios);
    expect(Object.fromEntries(mapa)).toEqual({ c1: 10, c2: 10, c3: 10, c4: 0 });
  });

  it("acepta fechas ISO como las que devuelve la API", () => {
    const mapa = calcularPuntosRespuestas([
      { id: "b", autorId: "ana", validacion: "correcta", creado: "2026-11-20T10:01:00.000Z" },
      { id: "a", autorId: "ana", validacion: "aproximada", creado: "2026-11-20T10:00:00.000Z" },
    ]);
    expect(Object.fromEntries(mapa)).toEqual({ a: 5, b: 0 });
  });

  it("sin comentarios, un mapa vacío", () => {
    expect(calcularPuntosRespuestas([]).size).toBe(0);
  });
});
