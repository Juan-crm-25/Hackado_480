import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BurbujaMensaje } from "./chat-tutor";

describe("BurbujaMensaje", () => {
  it("marca con texto, no solo con color, la respuesta fuera del temario", () => {
    const html = renderToStaticMarkup(
      <BurbujaMensaje mensaje={{ rol: "tutor", texto: "Eso no está en el módulo.", fueraDeTemario: true }} videos={[]} />,
    );
    expect(html).toContain("Fuera del temario");
  });

  it("no añade la marca a una respuesta normal", () => {
    const html = renderToStaticMarkup(<BurbujaMensaje mensaje={{ rol: "tutor", texto: "Hola" }} videos={[]} />);
    expect(html).not.toContain("Fuera del temario");
  });
});
