import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EstadoCargando, EstadoError, EstadoVacio } from "./estado";

describe("estados compartidos", () => {
  it("EstadoCargando se anuncia como estado con su texto", () => {
    const html = renderToStaticMarkup(<EstadoCargando texto="El tutor está escribiendo…" />);
    expect(html).toContain('role="status"');
    expect(html).toContain("El tutor está escribiendo…");
  });

  it("EstadoCargando tiene un texto por defecto", () => {
    expect(renderToStaticMarkup(<EstadoCargando />)).toContain("Cargando…");
  });

  it("EstadoError se anuncia como alerta con el mensaje", () => {
    const html = renderToStaticMarkup(<EstadoError>Sin conexión. Inténtalo de nuevo.</EstadoError>);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Sin conexión. Inténtalo de nuevo.");
  });

  it("EstadoVacio muestra el texto y las acciones sin interrumpir al lector de pantalla", () => {
    const html = renderToStaticMarkup(
      <EstadoVacio acciones={<button type="button">Crear</button>}>Aún no hay material.</EstadoVacio>,
    );
    expect(html).toContain("Aún no hay material.");
    expect(html).toContain("<button");
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('role="status"');
  });
});
