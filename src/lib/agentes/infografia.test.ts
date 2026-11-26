import { describe, expect, it, vi } from "vitest";
import type { Modulo } from "../types";
import { conceptoDelVideo, generarInfografia, validarInfografia } from "./infografia";
import { leerInstrucciones, rellenar } from "./instrucciones";

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

const capas = {
  plantilla: "capas",
  titulo: "Modelo de caja",
  elementos: [
    { nombre: "Margen", descripcion: "Espacio exterior" },
    { nombre: "Contenido", descripcion: "El texto" },
  ],
  fuente: { videoId: "v05", segundo: 15 },
};

describe("instrucciones de infografías", () => {
  it("se leen de agents/infografia.md y tienen todas las variables", () => {
    expect(() => rellenar(leerInstrucciones("infografia"), { modulo: "CSS", video: "Caja", concepto: "Caja", temario: "T" })).not.toThrow();
  });
});

describe("validarInfografia", () => {
  it("acepta plantillas de lista", () => {
    expect(validarInfografia(JSON.stringify(capas), modulo, "css-caja")).toEqual({
      conceptoId: "css-caja",
      titulo: "Modelo de caja",
      fuente: { videoId: "v05", segundo: 15 },
      plantilla: "capas",
      elementos: capas.elementos,
    });
  });

  it("acepta comparativas y descarta filas incompletas", () => {
    const r = validarInfografia(
      JSON.stringify({
        plantilla: "comparativa",
        titulo: "Unidades",
        columnas: ["Relativa a", "Uso"],
        filas: [
          { nombre: "px", valores: ["nada", "bordes"] },
          { nombre: "rem", valores: ["la raíz", "textos"] },
          { nombre: "em", valores: ["el elemento"] },
        ],
      }),
      modulo,
      "css-unidades",
    );
    expect(r.plantilla).toBe("comparativa");
    if (r.plantilla === "comparativa") expect(r.filas.map((f) => f.nombre)).toEqual(["px", "rem"]);
  });

  it("arregla la comparativa que cuenta el nombre de la fila como una columna más", () => {
    const r = validarInfografia(
      JSON.stringify({
        plantilla: "comparativa",
        titulo: "Métodos para añadir",
        columnas: ["Ubicación", "Método"],
        filas: [
          { nombre: "Al final del padre", valores: ["`append`"] },
          { nombre: "Al principio del padre", valores: ["`prepend`"] },
        ],
      }),
      modulo,
      "js-dom",
    );
    expect(r.plantilla).toBe("comparativa");
    if (r.plantilla === "comparativa") {
      expect(r.columnas).toEqual(["Método"]);
      expect(r.filas.map((f) => f.valores)).toEqual([["`append`"], ["`prepend`"]]);
    }
  });

  it("no toca una comparativa con filas de distinto tamaño: descarta las incompletas", () => {
    const r = validarInfografia(
      JSON.stringify({
        plantilla: "comparativa",
        titulo: "Unidades",
        columnas: ["Relativa a", "Uso"],
        filas: [
          { nombre: "px", valores: ["nada", "bordes"] },
          { nombre: "rem", valores: ["la raíz", "textos"] },
          { nombre: "em", valores: ["el elemento"] },
        ],
      }),
      modulo,
      "css-unidades",
    );
    if (r.plantilla === "comparativa") expect(r.columnas).toEqual(["Relativa a", "Uso"]);
  });

  it("recorta textos largos, quita repetidos y fuentes inventadas", () => {
    const largo = "x".repeat(500);
    const r = validarInfografia(
      JSON.stringify({ ...capas, elementos: [...capas.elementos, capas.elementos[0], { nombre: "Borde", descripcion: largo }], fuente: { videoId: "v99", segundo: 1 } }),
      modulo,
      "css-caja",
    );
    expect(r.fuente).toBeUndefined();
    if (r.plantilla !== "comparativa") {
      expect(r.elementos.map((e) => e.nombre)).toEqual(["Margen", "Contenido", "Borde"]);
      expect(r.elementos[2].descripcion.length).toBeLessThanOrEqual(140);
    }
  });

  it("rechaza plantillas desconocidas, pocos elementos o JSON roto", () => {
    expect(() => validarInfografia(JSON.stringify({ ...capas, plantilla: "tarta" }), modulo, "c")).toThrow(/desconocida/);
    expect(() => validarInfografia(JSON.stringify({ ...capas, elementos: [capas.elementos[0]] }), modulo, "c")).toThrow(/al menos/);
    expect(() => validarInfografia("no", modulo, "c")).toThrow(/JSON/);
  });
});

describe("conceptoDelVideo", () => {
  it("empareja cada vídeo con el concepto de su misma posición en el catálogo", () => {
    expect(conceptoDelVideo(modulo, modulo.videos[0]).id).toBe("css-especificidad");
    expect(conceptoDelVideo(modulo, caja).id).toBe("css-caja");
  });

  it("falla si el vídeo no es del módulo o no tiene concepto", () => {
    expect(() => conceptoDelVideo(modulo, { ...caja, id: "v01" })).toThrow(/v01/);
    expect(() => conceptoDelVideo({ ...modulo, conceptos: [modulo.conceptos[0]] }, caja)).toThrow(/concepto/);
  });
});

describe("generarInfografia", () => {
  it("pide la infografía del concepto del vídeo, solo con su transcripción y el modelo generador", async () => {
    const completar = vi.fn().mockResolvedValue({ texto: JSON.stringify(capas), simulado: false });
    const temario = vi.fn().mockReturnValue("[v05 @15] Cuatro capas");
    const r = await generarInfografia(modulo, caja, { completar, temario });

    expect(temario.mock.calls[0][0].videos.map((v: { id: string }) => v.id)).toEqual(["v05"]);
    expect(r.conceptoId).toBe("css-caja");
    expect(r.fuente).toEqual({ videoId: "v05", segundo: 15 });
    const op = completar.mock.calls[0][0];
    expect(op.modelo).toBe("generador");
    expect(op.mensajes[0].contenido).toContain("«Modelo de caja»");
    expect(op.mensajes[0].contenido).toContain("«Caja»");
    expect(op.mensajes[0].contenido).toContain("[v05 @15] Cuatro capas");
  });

  it("descarta la fuente si apunta a otro vídeo del módulo", async () => {
    const otro = { ...capas, fuente: { videoId: "v04", segundo: 10 } };
    const completar = vi.fn().mockResolvedValue({ texto: JSON.stringify(otro), simulado: false });
    const r = await generarInfografia(modulo, caja, { completar, temario: () => "[v05 @15] x" });
    expect(r.fuente).toBeUndefined();
  });
});
