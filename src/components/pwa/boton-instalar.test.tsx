import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BotonInstalar, BotonInstalarVista } from "./boton-instalar";

const pinta = (estado: Parameters<typeof BotonInstalarVista>[0]["estado"]) =>
  renderToStaticMarkup(<BotonInstalarVista estado={estado} onInstalar={() => {}} className="x" />);

describe("botón «Descarga la app»", () => {
  it("si se puede instalar, es un botón con su texto e icono que abre la instalación", () => {
    const html = pinta("disponible");
    expect(html).toMatch(/<button[^>]*type="button"[^>]*data-accion="instalar"/);
    expect(html).toContain("Descarga la app");
    expect(html).toContain("lucide-download");
  });

  it("en iPhone/iPad, el mismo botón abre los pasos para añadirla a la pantalla de inicio", () => {
    const html = pinta("ios");
    expect(html).toMatch(/<button[^>]*data-accion="instalar"/);
    expect(html).toContain("Descarga la app");
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("si ya está instalada o el navegador no lo permite, no se muestra (no se promete lo que no funciona)", () => {
    expect(pinta("instalada")).toBe("");
    expect(pinta("no_disponible")).toBe("");
  });

  it("en el servidor no se pinta nada: lo decide el navegador al cargar", () => {
    expect(renderToStaticMarkup(<BotonInstalar />)).toBe("");
  });
});
