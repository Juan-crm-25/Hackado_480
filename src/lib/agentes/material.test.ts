import { describe, expect, it, vi } from "vitest";
import type { Modulo } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { generarMaterialDeVideo, MAXIMO_SECCIONES, MAXIMO_TARJETAS, validarMaterial } from "./material";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [
    { id: "css-especificidad", nombre: "Selectores y especificidad" },
    { id: "css-caja", nombre: "Modelo de caja" },
  ],
  videos: [
    { id: "v04", titulo: "Especificidad", youtubeId: "", duracionSegundos: 300, transcripcion: "v04.vtt" },
    { id: "v05", titulo: "Caja", youtubeId: "", duracionSegundos: 190, transcripcion: "v05.vtt" },
  ],
};
const caja = modulo.videos[1];

const seccion = (i: number) => ({ titulo: `Apartado ${i}`, texto: `Texto ${i}`, fuente: { videoId: "v05", segundo: 38 } });
const tarjeta = (i: number) => ({ pregunta: `¿Pregunta ${i}?`, respuesta: `Respuesta ${i}`, fuente: { videoId: "v05", segundo: 85 } });
const valido = { resumen: [seccion(1), seccion(2)], tarjetas: [1, 2, 3, 4].map(tarjeta) };

describe("instrucciones del generador de material", () => {
  it("se leen de agents/material.md y tienen todas las variables", () => {
    expect(() => rellenar(leerInstrucciones("material"), { modulo: "CSS", video: "Caja", conceptos: "Caja", temario: "T" })).not.toThrow();
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

describe("generarMaterialDeVideo", () => {
  const responde = (datos: unknown) => vi.fn().mockResolvedValue({ texto: JSON.stringify(datos), simulado: false });

  it("trabaja solo con la transcripción de ese vídeo, con el modelo generador y sin datos de alumnos", async () => {
    const completar = responde(valido);
    const temario = vi.fn().mockReturnValue("[v05 @38] El padding es el relleno");
    const material = await generarMaterialDeVideo(modulo, caja, { completar, temario });

    expect(temario.mock.calls[0][0].videos.map((v: { id: string }) => v.id)).toEqual(["v05"]);
    expect(material.resumen).toHaveLength(2);
    expect(material.tarjetas).toHaveLength(4);
    expect(material).toHaveProperty("modelo");
    const op = completar.mock.calls[0][0];
    expect(op.modelo).toBe("generador");
    expect(op.mensajes[0].contenido).toContain("«Caja»");
    expect(op.mensajes[0].contenido).toContain("[v05 @38] El padding es el relleno");
  });

  it("descarta las fuentes que apuntan a otro vídeo del módulo", async () => {
    const otroVideo = { ...seccion(3), fuente: { videoId: "v04", segundo: 10 } };
    const material = await generarMaterialDeVideo(modulo, caja, {
      completar: responde({ ...valido, resumen: [seccion(1), otroVideo] }),
      temario: () => "[v05 @38] x",
    });
    expect(material.resumen[1].fuente).toBeUndefined();
  });

  it("se queda en un tamaño de vídeo: como mucho 3 apartados y 6 tarjetas", async () => {
    const material = await generarMaterialDeVideo(modulo, caja, {
      completar: responde({ resumen: [1, 2, 3, 4, 5].map(seccion), tarjetas: [1, 2, 3, 4, 5, 6, 7, 8].map(tarjeta) }),
      temario: () => "[v05 @38] x",
    });
    expect(MAXIMO_SECCIONES).toBe(3);
    expect(MAXIMO_TARJETAS).toBe(6);
    expect(material.resumen).toHaveLength(3);
    expect(material.tarjetas).toHaveLength(6);
  });

  it("no genera nada si el vídeo no es del módulo, sin transcripción o en modo simulado", async () => {
    const ajeno = { ...caja, id: "v01" };
    await expect(generarMaterialDeVideo(modulo, ajeno, { completar: vi.fn(), temario: () => "x" })).rejects.toThrow(/v01/);
    await expect(generarMaterialDeVideo(modulo, caja, { completar: vi.fn(), temario: () => "" })).rejects.toThrow(/transcripción/);
    await expect(
      generarMaterialDeVideo(modulo, caja, { completar: vi.fn().mockResolvedValue({ texto: "{}", simulado: true }), temario: () => "x" }),
    ).rejects.toThrow(/simulado/);
  });
});
