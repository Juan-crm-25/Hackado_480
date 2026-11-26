import { describe, expect, it } from "vitest";
import { extraerPrompt } from "./instrucciones";

const md = [
  "# Agente",
  "```prompt",
  "Principal {{a}}",
  "```",
  "Texto",
  "```prompt video",
  "Del vídeo {{b}}",
  "```",
].join("\n");

describe("extraerPrompt", () => {
  it("sin nombre, devuelve el bloque ```prompt sin nombre, aunque haya otros con nombre", () => {
    expect(extraerPrompt(md)).toBe("Principal {{a}}");
  });

  it("con nombre, devuelve el bloque ```prompt <nombre>", () => {
    expect(extraerPrompt(md, "video")).toBe("Del vídeo {{b}}");
  });

  it("falla si no existe el bloque pedido", () => {
    expect(() => extraerPrompt(md, "examen")).toThrow(/examen/);
  });
});
