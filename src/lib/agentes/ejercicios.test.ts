import { describe, expect, it, vi } from "vitest";
import type { Modulo, PlantillaEjercicios } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { EJERCICIOS_POR_CONCEPTO, MINIMO_EJERCICIOS, generarEjercicios, validarEjercicios } from "./ejercicios";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [
    { id: "css-especificidad", nombre: "Selectores y especificidad" },
    { id: "css-caja", nombre: "Modelo de caja" },
    { id: "css-unidades", nombre: "Unidades em y rem" },
  ],
  videos: [
    { id: "v04", titulo: "Especificidad", youtubeId: "", duracionSegundos: 972 },
    { id: "v05", titulo: "Caja", youtubeId: "", duracionSegundos: 257 },
    { id: "v06", titulo: "Unidades", youtubeId: "", duracionSegundos: 695 },
  ],
};

const plantilla: PlantillaEjercicios = {
  moduloId: "m2-css",
  tipos: ["test", "respuesta_corta", "abierta"],
  ejemplos: [],
};

/** Un ejercicio de test válido; `n` cambia el enunciado para que no se repita. */
const test = (n: number, conceptoId = "css-especificidad", videoId = "v04") => ({
  tipo: "test",
  conceptoId,
  enunciado: `¿Qué regla gana en el caso ${n}?`,
  opciones: ["La de la clase", "La del id", "La última"],
  solucion: 1,
  fuente: { videoId, segundo: 120 },
});
const corta = (n: number) => ({
  tipo: "respuesta_corta",
  conceptoId: "css-unidades",
  enunciado: `¿Cuántos px son ${n}rem?`,
  solucion: `${n * 16}px`,
  fuente: { videoId: "v06", segundo: 300 },
});
const abierta = (n: number) => ({
  tipo: "abierta",
  conceptoId: "css-caja",
  enunciado: `Explica el caso ${n} de padding y margin.`,
  rubrica: "Padding es espacio de dentro y margin de fuera.",
  fuente: { videoId: "v05", segundo: 60 },
});

/** 9 ejercicios válidos: 3 por concepto. */
const nueve = () => [test(1), test(2), test(3), corta(1), corta(2), corta(3), abierta(1), abierta(2), abierta(3)];
const json = (ejercicios: unknown[]) => JSON.stringify({ ejercicios });

describe("instrucciones del generador de ejercicios", () => {
  it("se leen de agents/generador-ejercicios.md y tienen todas las variables", () => {
    const valores = { modulo: "CSS", conceptos: "c", tipos: "test", ejemplos: "[]", indicaciones: "i", total: "9", temario: "T" };
    expect(() => rellenar(leerInstrucciones("generador-ejercicios"), valores)).not.toThrow();
  });
});

describe("validarEjercicios", () => {
  it("acepta ejercicios correctos (también dentro de ```json) y les pone módulo, concepto y referencia", () => {
    const r = validarEjercicios("```json\n" + json(nueve()) + "\n```", modulo, plantilla);
    expect(r).toHaveLength(9);
    expect(r[0]).toEqual({
      moduloId: "m2-css",
      conceptoId: "css-especificidad",
      tipo: "test",
      enunciado: "¿Qué regla gana en el caso 1?",
      opciones: ["La de la clase", "La del id", "La última"],
      solucion: 1,
      referencia: { videoId: "v04", segundo: 120 },
    });
    expect(r[3]).toEqual({
      moduloId: "m2-css",
      conceptoId: "css-unidades",
      tipo: "respuesta_corta",
      enunciado: "¿Cuántos px son 1rem?",
      solucion: "16px",
      referencia: { videoId: "v06", segundo: 300 },
    });
    expect(r[6]).toMatchObject({ tipo: "abierta", rubrica: "Padding es espacio de dentro y margin de fuera." });
    expect(r[6]).not.toHaveProperty("opciones");
    expect(r[6]).not.toHaveProperty("solucion");
  });

  it("descarta los de un tipo que no está en la plantilla", () => {
    const codigo = { ...abierta(9), tipo: "codigo" };
    const r = validarEjercicios(json([...nueve(), codigo]), modulo, plantilla);
    expect(r.some((e) => e.tipo === "codigo")).toBe(false);
  });

  it("descarta conceptos o vídeos que no son del módulo y fuentes sin vídeo", () => {
    const malos = [
      { ...test(10), conceptoId: "js-eventos" },
      { ...test(11), fuente: { videoId: "v99", segundo: 5 } },
      { ...test(12), fuente: undefined },
    ];
    const r = validarEjercicios(json([...malos, ...nueve()]), modulo, plantilla);
    expect(r.map((e) => e.enunciado)).not.toContain("¿Qué regla gana en el caso 10?");
    expect(r).toHaveLength(9);
  });

  it("descarta un test sin opciones suficientes, con opciones repetidas o con la solución fuera de rango", () => {
    const malos = [
      { ...test(20), opciones: ["Solo una"], solucion: 0 },
      { ...test(21), opciones: ["A", "A", "B"] },
      { ...test(22), solucion: 3 },
      { ...test(23), solucion: "1" },
    ];
    const r = validarEjercicios(json([...malos, ...nueve()]), modulo, plantilla);
    expect(r.filter((e) => e.tipo === "test").map((e) => e.enunciado)).toEqual([1, 2, 3].map((n) => `¿Qué regla gana en el caso ${n}?`));
  });

  it("respuesta corta: exige la solución en texto (un número se pasa a texto) y quita las opciones", () => {
    const sinSolucion = { ...corta(30), solucion: "  " };
    const numerica = { ...corta(4), solucion: 64, opciones: ["x", "y"] };
    const r = validarEjercicios(json([sinSolucion, numerica, ...nueve()]), modulo, plantilla);
    expect(r.find((e) => e.enunciado.includes("30rem"))).toBeUndefined();
    const cuatro = r.find((e) => e.enunciado.includes("4rem"));
    expect(cuatro).toMatchObject({ solucion: "64" });
    expect(cuatro).not.toHaveProperty("opciones");
  });

  it("abierta y código: exigen rúbrica; en código la solución, si la hay, es un código de referencia", () => {
    const conCodigo: PlantillaEjercicios = { ...plantilla, tipos: [...plantilla.tipos, "codigo"] };
    const sinRubrica = { ...abierta(40), rubrica: "" };
    const codigo = { ...abierta(41), tipo: "codigo", solucion: "<main></main>" };
    const r = validarEjercicios(json([sinRubrica, codigo, ...nueve()]), modulo, conCodigo);
    expect(r.find((e) => e.enunciado.includes("caso 40"))).toBeUndefined();
    expect(r.find((e) => e.tipo === "codigo")).toMatchObject({ solucion: "<main></main>", rubrica: abierta(41).rubrica });
  });

  it("descarta los enunciados repetidos, aunque cambien mayúsculas o espacios", () => {
    // Sin quitar repetidos, especificidad tendría 3 (test 1, el repetido y test 2) y saldrían 9.
    const repetido = { ...test(1), enunciado: "  ¿qué regla gana en el  caso 1? " };
    const ejercicios = [test(1), repetido, test(2), corta(1), corta(2), corta(3), abierta(1), abierta(2), abierta(3)];
    const r = validarEjercicios(json(ejercicios), modulo, plantilla);
    expect(r).toHaveLength(8);
  });

  it(`se queda con ${EJERCICIOS_POR_CONCEPTO} por concepto como mucho`, () => {
    const r = validarEjercicios(json([test(4), ...nueve()]), modulo, plantilla);
    expect(r.filter((e) => e.conceptoId === "css-especificidad")).toHaveLength(EJERCICIOS_POR_CONCEPTO);
    expect(r).toHaveLength(9);
  });

  it(`falla si quedan menos de ${MINIMO_EJERCICIOS} válidos o algún concepto se queda sin ejercicios`, () => {
    expect(() => validarEjercicios(json(nueve().slice(0, MINIMO_EJERCICIOS - 1)), modulo, plantilla)).toThrow(/insuficientes/);
    const sinCaja = [test(1), test(2), test(3), corta(1), corta(2), corta(3)];
    expect(() => validarEjercicios(json(sinCaja), modulo, plantilla)).toThrow(/Modelo de caja/);
  });

  it("falla si la respuesta no es JSON o no trae la lista de ejercicios", () => {
    expect(() => validarEjercicios("no es json", modulo, plantilla)).toThrow(/JSON/);
    expect(() => validarEjercicios(JSON.stringify({ otra: [] }), modulo, plantilla)).toThrow(/insuficientes/);
  });
});

describe("generarEjercicios", () => {
  const conEjemplos: PlantillaEjercicios = {
    ...plantilla,
    ejemplos: [{ tipo: "respuesta_corta", enunciado: "¿Cuántos px mide 3rem?", solucion: "48px" }],
    indicaciones: "Nivel principiante.",
  };
  const iaQueResponde = (texto: string) => vi.fn().mockResolvedValue({ texto, simulado: false });
  const temario = () => "[v04 @120] La especificidad decide qué regla gana";

  it("pide los ejercicios al modelo generador con la plantilla, los conceptos y el temario, y los valida", async () => {
    const completar = iaQueResponde(json(nueve()));
    const ejercicios = await generarEjercicios(modulo, conEjemplos, { completar, temario });

    expect(ejercicios).toHaveLength(9);
    expect(ejercicios.every((e) => e.moduloId === "m2-css")).toBe(true);
    const op = completar.mock.calls[0][0];
    expect(op).toMatchObject({ modelo: "generador", formatoJson: true });
    const sistema = op.mensajes[0].contenido as string;
    expect(sistema).toContain("[v04 @120] La especificidad decide qué regla gana");
    expect(sistema).toContain("css-especificidad: Selectores y especificidad");
    expect(sistema).toContain("test, respuesta_corta, abierta");
    expect(sistema).toContain("¿Cuántos px mide 3rem?");
    expect(sistema).toContain("Nivel principiante.");
    expect(sistema).toContain("Genera 9 ejercicios");
  });

  it("sin indicaciones del profesor, lo dice en vez de dejar el hueco vacío", async () => {
    const completar = iaQueResponde(json(nueve()));
    await generarEjercicios(modulo, plantilla, { completar, temario });
    expect(completar.mock.calls[0][0].mensajes[0].contenido).toContain("Ninguna.");
  });

  it("no llama a la IA si el módulo no tiene transcripciones", async () => {
    const completar = vi.fn();
    await expect(generarEjercicios(modulo, conEjemplos, { completar, temario: () => "" })).rejects.toThrow(/transcripciones/);
    expect(completar).not.toHaveBeenCalled();
  });

  it("no genera nada en modo simulado ni si la respuesta no pasa la validación", async () => {
    const simulado = vi.fn().mockResolvedValue({ texto: "{}", simulado: true });
    await expect(generarEjercicios(modulo, conEjemplos, { completar: simulado, temario })).rejects.toThrow(/simulado/);
    await expect(generarEjercicios(modulo, conEjemplos, { completar: iaQueResponde(json([test(1)])), temario })).rejects.toThrow(
      /insuficientes/,
    );
  });
});
