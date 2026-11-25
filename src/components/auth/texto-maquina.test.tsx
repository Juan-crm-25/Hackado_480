import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextoMaquina } from "./texto-maquina";

const FRASE = "Aprende a tu ritmo, con un tutor que te acompaña";

describe("TextoMaquina", () => {
  const html = renderToStaticMarkup(<TextoMaquina texto={FRASE} />);

  it("los lectores de pantalla leen la frase completa desde el principio", () => {
    expect(html).toMatch(new RegExp(`<span class="sr-only">${FRASE}</span>`));
  });

  it("la parte animada está oculta para los lectores de pantalla", () => {
    expect(html).toMatch(/<span aria-hidden="true"[^>]*>/);
  });

  it("reserva el sitio de la frase entera para que la página no salte mientras se escribe", () => {
    expect(html).toMatch(new RegExp(`<span class="invisible">${FRASE}</span>`));
  });

  it("muestra la línea | al final, en verde y parpadeando solo si se permite el movimiento", () => {
    expect(html).toMatch(/<span[^>]*class="[^"]*text-brand[^"]*motion-safe:animate-pulse[^"]*"[^>]*>\|<\/span>/);
  });
});
