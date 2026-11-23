import { describe, expect, it, vi } from "vitest";
import type { Modulo } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { generarMaterialComun, validarMaterial } from "./material";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [{ id: "css-caja", nombre: "Modelo de caja" }],
  videos: [{ id: "v05", titulo: "Caja", youtubeId: "", duracionSegundos: 190, transcripcion: "v05.vtt" }],
};

const seccion = (i: number) => ({ titulo: `Apartado ${i}`, texto: `Texto ${i}`, fuente: { videoId: "v05", segundo: 38 } });
const tarjeta = (i: number) => ({ pregunta: `¿Pregunta ${i}?`, respuesta: `Respuesta ${i}`, fuente: { videoId: "v05", segundo: 85 } });
const valido = { resumen: [seccion(1), seccion(2)], tarjetas: [1, 2, 3, 4].map(tarjeta) };

describe("instrucciones del generador de material", () => {
  it("se leen de agents/material.md y tienen todas las variables", () => {
    expect(() => rellenar(leerInstrucciones("material"), { modulo: "CSS", conceptos: "Caja", temario: "T" })).not.toThrow();
  });
});

describe("validarMaterial", () => {
  it("acepta material correcto, también dentro de un bloque ```json", () => {
    const r = validarMaterial("```json\n" + JSON.stringify(valido) + "\n```", modulo);
    expect(r.resumen).toHaveLength(2);
    expect(r.tarjetas[0]).toEqual({ pregunta: "¿Pregunta 1?", respuesta: "Respuesta 1", fuente: { videoId: "v05", segundo: 85 } });
  });

  it("descarta vacíos, repetidos y fuentes inventadas", () => {
    const r = validarMaterial(
      JSON.stringify({
        resumen: [seccion(1), seccion(1), { titulo: "", texto: "x" }, { ...seccion(2), fuente: { videoId: "v99", segundo: 3 } }],
        tarjetas: [...[1, 2, 3, 4].map(tarjeta), tarjeta(1), { pregunta: "¿?", respuesta: "  " }],
      }),
      modulo,
    );
    expect(r.resumen.map((s) => s.titulo)).toEqual(["Apartado 1", "Apartado 2"]);
    expect(r.resumen[1].fuente).toBeUndefined();
    expect(r.tarjetas).toHaveLength(4);
  });

  it("falla si no hay material suficiente o no es JSON", () => {
    expect(() => validarMaterial(JSON.stringify({ resumen: [seccion(1)], tarjetas: valido.tarjetas }), modulo)).toThrow(/insuficiente/);
    expect(() => validarMaterial("no es json", modulo)).toThrow(/JSON/);
  });
});

describe("generarMaterialComun", () => {
  it("usa el modelo generador, sin datos de alumnos, y lo marca como no revisado", async () => {
    const completar = vi.fn().mockResolvedValue({ texto: JSON.stringify(valido), simulado: false });
    const material = await generarMaterialComun(modulo, { completar, temario: () => "[v05 @38] El padding es el relleno" });

    expect(material).toMatchObject({ moduloId: "m2-css", revisado: false });
    const op = completar.mock.calls[0][0];
    expect(op.modelo).toBe("generador");
    expect(op.mensajes[0].contenido).toContain("[v05 @38] El padding es el relleno");
  });

  it("no genera nada sin transcripciones ni en modo simulado", async () => {
    await expect(generarMaterialComun(modulo, { completar: vi.fn(), temario: () => "" })).rejects.toThrow(/transcripciones/);
    await expect(
      generarMaterialComun(modulo, { completar: vi.fn().mockResolvedValue({ texto: "{}", simulado: true }), temario: () => "x" }),
    ).rejects.toThrow(/simulado/);
  });
});
