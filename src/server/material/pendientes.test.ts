import { describe, expect, it } from "vitest";
import { porGenerar } from "./pendientes";

const fila = (videoId: string, tipo: "resumen" | "tarjetas" | "infografia", revisado = false) => ({ videoId, tipo, revisado });

describe("porGenerar: qué le falta a un vídeo", () => {
  it("sin nada guardado, le falta todo", () => {
    expect(porGenerar("v04", [], false)).toEqual({ resumen: true, tarjetas: true, infografia: true });
  });

  it("no repite lo que ya existe, aunque no esté revisado", () => {
    const guardado = [fila("v04", "resumen"), fila("v04", "tarjetas"), fila("v05", "infografia")];
    expect(porGenerar("v04", guardado, false)).toEqual({ resumen: false, tarjetas: false, infografia: true });
  });

  it("con --forzar regenera lo que no está revisado, pero nunca lo revisado", () => {
    const guardado = [fila("v04", "resumen", true), fila("v04", "tarjetas"), fila("v04", "infografia")];
    expect(porGenerar("v04", guardado, true)).toEqual({ resumen: false, tarjetas: true, infografia: true });
  });

  it("solo mira el material de ese vídeo", () => {
    const guardado = [fila("v05", "resumen", true), fila("v05", "tarjetas", true), fila("v05", "infografia", true)];
    expect(porGenerar("v04", guardado, true)).toEqual({ resumen: true, tarjetas: true, infografia: true });
  });
});
