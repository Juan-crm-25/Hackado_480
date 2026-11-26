import { describe, expect, it, vi } from "vitest";
import type { Modulo, PeticionMaterialPersonal } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { ErrorMaterial, generarMaterialPersonal } from "./material-personal";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [{ id: "css-especificidad", nombre: "Selectores y especificidad" }],
  videos: [{ id: "v04", titulo: "Especificidad", youtubeId: "", duracionSegundos: 200, transcripcion: "v04.vtt" }],
};

const tarjetas = [1, 2, 3, 4].map((i) => ({ pregunta: `¿P${i}?`, respuesta: `R${i}`, fuente: { videoId: "v04", segundo: 125 } }));
const deps = (texto: string) => ({
  completar: vi.fn().mockResolvedValue({ texto, simulado: false }),
  temario: () => "[v04 @125] Un id gana a una clase",
  ahora: () => new Date("2026-11-24T10:00:00Z"),
  id: () => "mp-1",
});
const peticion = (extra: Partial<PeticionMaterialPersonal> = {}): PeticionMaterialPersonal & { alumnoId: string } => ({
  alumnoId: "a1",
  moduloId: "m2-css",
  tipo: "tarjetas",
  ...extra,
});

describe("instrucciones del material personal", () => {
  it("se leen de agents/material-personal.md y tienen todas las variables", () => {
    const valores = { modulo: "CSS", alcance: "x", nivel: "x", formato: "x", temario: "x" };
    expect(() => rellenar(leerInstrucciones("material-personal"), valores)).not.toThrow();
  });
});

describe("generarMaterialPersonal", () => {
  it("genera tarjetas del concepto y nivel pedidos, con el enfoque filtrado fuera de las instrucciones", async () => {
    const d = deps(JSON.stringify({ tarjetas }));
    const material = await generarMaterialPersonal(
      {
        modulo,
        peticion: peticion({ conceptoId: "css-especificidad", nivel: "basico", enfoque: "con ejemplos, soy Lucía (lucia@x.com)" }),
        nombresOcultos: ["Lucía Martín"],
      },
      d,
    );

    expect(material).toMatchObject({ id: "mp-1", tipo: "tarjetas", conceptoId: "css-especificidad", nivel: "basico" });
    expect(material.tarjetas).toHaveLength(4);

    const [sistema, usuario] = d.completar.mock.calls[0][0].mensajes;
    expect(sistema.contenido).toContain("solo el concepto «Selectores y especificidad»");
    expect(sistema.contenido).toContain("más sencillo");
    expect(sistema.contenido).not.toContain("con ejemplos");
    expect(usuario.contenido).toBe("Prepárame el material. Mi enfoque: con ejemplos, soy [NOMBRE] ([EMAIL])");
  });

  it("genera un resumen de todo el módulo con nivel normal por defecto", async () => {
    const resumen = [{ titulo: "Especificidad", texto: "Un id gana a una clase", fuente: { videoId: "v04", segundo: 125 } }];
    const material = await generarMaterialPersonal({ modulo, peticion: peticion({ tipo: "resumen" }), nombresOcultos: [] }, deps(JSON.stringify({ resumen })));
    expect(material).toMatchObject({ tipo: "resumen", nivel: "normal", conceptoId: undefined });
    expect(material.resumen).toHaveLength(1);
  });

  it("rechaza conceptos de otro módulo y respuestas sin material suficiente", async () => {
    await expect(
      generarMaterialPersonal({ modulo, peticion: peticion({ conceptoId: "js-dom" }), nombresOcultos: [] }, deps("{}")),
    ).rejects.toBeInstanceOf(ErrorMaterial);
    await expect(
      generarMaterialPersonal({ modulo, peticion: peticion(), nombresOcultos: [] }, deps(JSON.stringify({ tarjetas: tarjetas.slice(0, 2) }))),
    ).rejects.toThrow(/tarjetas/);
  });
});
