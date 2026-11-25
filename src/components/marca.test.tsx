import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Marca } from "./marca";

describe("Marca", () => {
  it("se lee como «480 Academy» aunque se vea «480_Academy»", () => {
    const html = renderToStaticMarkup(<Marca />);
    // El guion es decorativo: un lector de pantalla no debe leer «guion bajo».
    expect(html).toMatch(/aria-hidden="true"[^>]*data-guion/);
    // Hay un espacio solo para lectores de pantalla entre «480» y «Academy».
    expect(html).toContain('<span class="sr-only"> </span>');
    expect(html.replace(/<[^>]+>/g, "")).toBe("480 Academy");
  });

  it("el guion cambia de color solo si no se ha pedido reducir el movimiento", () => {
    const html = renderToStaticMarkup(<Marca />);
    expect(html).toContain("motion-safe:animate-marca");
    // Color fijo cuando no hay animación: el coral es el único de los tres que llega a 3:1 sobre blanco.
    expect(html).toContain("bg-brand-coral");
  });
});
