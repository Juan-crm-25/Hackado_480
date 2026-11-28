import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TextoConCodigo } from "./fuente-video";
import { TextoMarkdown } from "./texto-markdown";

const enLinea = (texto: string) => renderToStaticMarkup(<TextoConCodigo texto={texto} />);
const bloque = (texto: string) => renderToStaticMarkup(<TextoMarkdown texto={texto} />);

describe("TextoConCodigo (en línea)", () => {
  it("pinta las **negritas** y el `código`, sin los asteriscos ni las comillas", () => {
    const html = enLinea("Un **id** gana a una `.clase`.");
    expect(html).toContain("<strong>id</strong>");
    expect(html).toMatch(/<code[^>]*>\.clase<\/code>/);
    expect(html).not.toContain("**");
  });

  it("dentro del código no toca los asteriscos", () => {
    expect(enLinea("Escribe `**a**` tal cual")).toMatch(/<code[^>]*>\*\*a\*\*<\/code>/);
  });

  it("unos asteriscos sin cerrar se quedan como texto", () => {
    expect(enLinea("2 ** 3 es una potencia")).toBe("2 ** 3 es una potencia");
  });
});

describe("TextoMarkdown (párrafos y listas)", () => {
  it("convierte las líneas «- » y «* » en una lista y separa los párrafos", () => {
    const html = bloque("Hay dos tipos:\n- **flex container** (padre)\n* flex items (hijos)\n\nY ya está.");
    expect(html).toBe(
      "<p>Hay dos tipos:</p><ul class=\"list-disc pl-5\"><li><strong>flex container</strong> (padre)</li><li>flex items (hijos)</li></ul><p>Y ya está.</p>",
    );
  });

  it("las listas numeradas van en <ol>", () => {
    expect(bloque("1. Primero\n2. Segundo")).toBe('<ol class="list-decimal pl-5"><li>Primero</li><li>Segundo</li></ol>');
  });

  it("un texto sin formato es un solo párrafo y conserva sus saltos de línea", () => {
    expect(bloque("Hola\nque tal")).toBe("<p>Hola\nque tal</p>");
  });
});
