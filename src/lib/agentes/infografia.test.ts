import { describe, expect, it, vi } from "vitest";
import type { Modulo } from "../types";
import { generarInfografia, validarInfografia } from "./infografia";
import { leerInstrucciones, rellenar } from "./instrucciones";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [{ id: "css-caja", nombre: "Modelo de caja" }],
  videos: [{ id: "v05", titulo: "Caja", youtubeId: "", duracionSegundos: 190, transcripcion: "v05.vtt" }],
};

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
    expect(() => rellenar(leerInstrucciones("infografia"), { modulo: "CSS", concepto: "Caja", temario: "T" })).not.toThrow();
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

describe("generarInfografia", () => {
  it("pide una infografía del concepto con el modelo generador", async () => {
    const completar = vi.fn().mockResolvedValue({ texto: JSON.stringify(capas), simulado: false });
    const r = await generarInfografia(modulo, modulo.conceptos[0], { completar, temario: () => "[v05 @15] Cuatro capas" });
    expect(r.conceptoId).toBe("css-caja");
    const op = completar.mock.calls[0][0];
    expect(op.modelo).toBe("generador");
    expect(op.mensajes[0].contenido).toContain("«Modelo de caja»");
    expect(op.mensajes[0].contenido).toContain("[v05 @15] Cuatro capas");
  });
});
