import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const manifiesto = JSON.parse(readFileSync(join(__dirname, "manifest.json"), "utf8"));

describe("manifiesto de la PWA", () => {
  it("tiene el nombre de la app y se abre como aplicación", () => {
    expect(manifiesto.name).toBe("480 Academy");
    expect(manifiesto.start_url).toBe("/");
    expect(manifiesto.display).toBe("standalone");
  });

  it("declara los iconos de 192 y 512 px y existen en public/", () => {
    const tamanos = manifiesto.icons.map((icono: { sizes: string }) => icono.sizes);
    expect(tamanos).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icono of manifiesto.icons as { src: string }[]) {
      expect(existsSync(join(RAIZ, "public", icono.src))).toBe(true);
    }
  });

  it("tiene un id fijo, para que el navegador la reconozca como la misma app aunque cambie la URL de inicio", () => {
    expect(manifiesto.id).toBe("/");
  });

  it("declara un icono maskable de 512 px que existe (Android lo recorta a su forma sin cortar el dibujo)", () => {
    const maskable = (manifiesto.icons as { src: string; sizes: string; purpose?: string }[]).find(
      (i) => i.purpose === "maskable",
    );
    expect(maskable?.sizes).toBe("512x512");
    expect(existsSync(join(RAIZ, "public", maskable!.src))).toBe(true);
  });

  it("en public/icons solo quedan los iconos que se usan", () => {
    expect(existsSync(join(RAIZ, "public", "icons", "icono-original.png"))).toBe(false);
  });

  it("hay favicon e icono de Apple en src/app", () => {
    expect(existsSync(join(__dirname, "favicon.ico"))).toBe(true);
    expect(existsSync(join(__dirname, "apple-icon.png"))).toBe(true);
  });
});
