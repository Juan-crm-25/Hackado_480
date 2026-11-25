import { describe, expect, it } from "vitest";
import { anuncios } from "./anuncios";

describe("anuncios de ejemplo", () => {
  it("son exactamente dos: Cyber Monday y Navidad", () => {
    expect(anuncios).toHaveLength(2);
    expect(anuncios[0].titulo).toMatch(/Cyber Monday/);
    expect(anuncios[1].titulo).toMatch(/Navidad/);
  });

  it("cada uno tiene texto, botón y un enlace interno", () => {
    for (const a of anuncios) {
      expect(a.texto.length).toBeGreaterThan(0);
      expect(a.cta.length).toBeGreaterThan(0);
      expect(a.href === "/" || a.href.startsWith("/cursos/")).toBe(true);
    }
  });
});
