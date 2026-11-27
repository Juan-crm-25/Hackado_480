import { describe, expect, it } from "vitest";
import type { EjercicioPublico, ResultadoTestModulo, TestModulo } from "@/lib/types";
import { cuantasRespondidas, mensajeResultado, peticionEntrega, textoDeRespuesta, textoNota } from "./logica";

const pregunta = (id: string, tipo: EjercicioPublico["tipo"], opciones?: string[]): EjercicioPublico => ({
  id,
  moduloId: "m2-css",
  conceptoId: "css-caja",
  tipo,
  enunciado: `Pregunta ${id}`,
  ...(opciones ? { opciones } : {}),
  referencia: { videoId: "v05", segundo: 60 },
});
const test: TestModulo = {
  moduloId: "m2-css",
  firma: "firma",
  notaAprobado: 7,
  preguntas: [pregunta("a", "test", ["Sí", "No"]), pregunta("b", "respuesta_corta"), pregunta("c", "abierta")],
};

describe("cuantasRespondidas", () => {
  it("cuenta las elegidas en test y las que tienen texto (sin contar espacios)", () => {
    expect(cuantasRespondidas(test.preguntas, {})).toBe(0);
    expect(cuantasRespondidas(test.preguntas, { a: 0, b: "  ", c: "algo" })).toBe(2);
    expect(cuantasRespondidas(test.preguntas, { a: 1, b: "margin", c: "algo", otra: "x" })).toBe(3);
  });
});

describe("peticionEntrega", () => {
  it("manda la firma y una respuesta por pregunta, en orden y sin espacios de más", () => {
    expect(peticionEntrega(test, { c: " texto ", a: 1, b: "margin" })).toEqual({
      firma: "firma",
      respuestas: [
        { ejercicioId: "a", respuesta: 1 },
        { ejercicioId: "b", respuesta: "margin" },
        { ejercicioId: "c", respuesta: "texto" },
      ],
    });
  });
});

describe("textoDeRespuesta", () => {
  it("en las de test, el texto de la opción elegida; en el resto, lo escrito", () => {
    expect(textoDeRespuesta(test.preguntas[0], 1)).toBe("No");
    expect(textoDeRespuesta(test.preguntas[1], "margin")).toBe("margin");
    expect(textoDeRespuesta(test.preguntas[1], undefined)).toBe("Sin responder");
  });
});

describe("textoNota", () => {
  it("con coma y sin decimales de más", () => {
    expect(textoNota(8.57)).toBe("8,57");
    expect(textoNota(10)).toBe("10");
    expect(textoNota(7.5)).toBe("7,5");
  });
});

describe("mensajeResultado", () => {
  const base: ResultadoTestModulo = { nota: 8, aprobado: true, notaAprobado: 7, mejorNota: 8, estado: "completado", resultados: [] };

  it("aprobado: módulo completado", () => {
    expect(mensajeResultado(base)).toMatch(/Aprobado.*completado el módulo/);
  });

  it("suspendido: cuánto hace falta y que repase", () => {
    expect(mensajeResultado({ ...base, nota: 5, aprobado: false, mejorNota: 5, estado: "en_curso" })).toMatch(/un 7 .*Repasa/);
  });

  it("suspendido pero ya lo tenía aprobado: cuenta su mejor nota", () => {
    expect(mensajeResultado({ ...base, nota: 4, aprobado: false, mejorNota: 9, estado: "completado" })).toMatch(/mejor nota, un 9/);
  });
});
