/**
 * Guardia de la guía de estilo (docs/estilo.md): en la interfaz solo se usan tokens semánticos
 * (bg-primary, text-muted-foreground, bg-brand, chart-*…). Falla si alguien usa colores sueltos
 * de la paleta de Tailwind o colores escritos a mano.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..");
const CARPETAS = ["src/app", "src/components"];

const PALETA =
  /\b(?:text|bg|border|ring|fill|stroke|outline|divide|from|via|to|decoration|shadow|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const HEX_EN_TEXTO = /["'`\[]#[0-9a-fA-F]{3,8}\b/;
const FUNCION_COLOR = /(?<![\w-])(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

function ficheros(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(tsx?|jsx?)$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });
}

const fuentes = CARPETAS.flatMap((c) => ficheros(join(RAIZ, c)));

describe("guía de estilo: solo tokens de color", () => {
  it("encuentra ficheros que revisar", () => {
    expect(fuentes.length).toBeGreaterThan(0);
  });

  it.each([
    ["clases de la paleta de Tailwind (gray-*, sky-*…)", PALETA],
    ["colores hex", HEX_EN_TEXTO],
    ["colores rgb()/hsl()/oklch()", FUNCION_COLOR],
  ])("ningún fichero usa %s", (_, patron) => {
    const fallos = fuentes.flatMap((ruta) =>
      readFileSync(ruta, "utf8")
        .split("\n")
        .flatMap((linea, i) => (patron.test(linea) ? [`${relative(RAIZ, ruta)}:${i + 1}: ${linea.trim()}`] : [])),
    );
    expect(fallos, "Usa los tokens de docs/estilo.md en lugar de estos colores").toEqual([]);
  });
});
