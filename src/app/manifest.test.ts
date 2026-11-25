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

  it("hay favicon e icono de Apple en src/app", () => {
    expect(existsSync(join(__dirname, "favicon.ico"))).toBe(true);
    expect(existsSync(join(__dirname, "apple-icon.png"))).toBe(true);
  });
});
