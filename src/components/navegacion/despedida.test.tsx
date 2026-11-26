import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { estaDespidiendo, mostrarDespedida, ocultarDespedida, PantallaDespedida, suscribirDespedida } from "./despedida";

afterEach(() => ocultarDespedida());

describe("estado de la despedida", () => {
  it("se muestra al cerrar sesión y se oculta después, avisando a quien escucha", () => {
    const aviso = vi.fn();
    const dejar = suscribirDespedida(aviso);
    expect(estaDespidiendo()).toBe(false);

    mostrarDespedida();
    expect(estaDespidiendo()).toBe(true);
    ocultarDespedida();
    expect(estaDespidiendo()).toBe(false);
    expect(aviso).toHaveBeenCalledTimes(2);

    dejar();
    mostrarDespedida();
    expect(aviso).toHaveBeenCalledTimes(2);
  });
});

describe("PantallaDespedida", () => {
  const html = renderToStaticMarkup(<PantallaDespedida />);

  it("anuncia la despedida a los lectores de pantalla con texto, no solo con la imagen", () => {
    expect(html).toMatch(/role="status"/);
    expect(html).toContain("¡Hasta pronto!");
  });

  it("el astronauta es decorativo y despega solo si el usuario acepta animaciones", () => {
    expect(html).toMatch(/<img[^>]*src="\/ilustraciones\/astronauta\.svg"[^>]*alt=""|<img[^>]*alt=""[^>]*src="\/ilustraciones\/astronauta\.svg"/);
    expect(html).toContain("motion-safe:animate-despegar");
  });
});
