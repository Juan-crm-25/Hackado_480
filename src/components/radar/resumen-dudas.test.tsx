import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResumenDudas, TarjetaResumen } from "./resumen-dudas";

describe("TarjetaResumen", () => {
  it("mientras carga, lo anuncia como estado", () => {
    const html = renderToStaticMarkup(<TarjetaResumen estado={{ tipo: "cargando" }} onReintentar={() => {}} />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Preparando el resumen de las dudas…");
  });

  it("con el resumen, lo muestra marcado como generado por IA y con el código formateado", () => {
    const html = renderToStaticMarkup(
      <TarjetaResumen estado={{ tipo: "listo", resumen: "Repasad `!important` en clase." }} onReintentar={() => {}} />,
    );
    expect(html).toContain("Resumen de las dudas");
    expect(html).toContain("Generado por IA");
    expect(html).toContain("<code");
    expect(html).toContain("!important");
  });

  it("si falla, lo dice como alerta y ofrece reintentar", () => {
    const html = renderToStaticMarkup(<TarjetaResumen estado={{ tipo: "error", mensaje: "La IA no responde." }} onReintentar={() => {}} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("La IA no responde.");
    expect(html).toContain("Reintentar");
  });
});

describe("ResumenDudas", () => {
  it("empieza cargando (pide el resumen al montarse)", () => {
    expect(renderToStaticMarkup(<ResumenDudas curso="desarrollo-web" />)).toContain("Preparando el resumen de las dudas…");
  });
});
