import { describe, expect, it } from "vitest";
import { claveVistos, guardarVistos, leerVistos, marcarVisto } from "./vistos";

/** Almacén en memoria con la forma de Storage (getItem/setItem), sin DOM. */
function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
  };
}

describe("vistos del módulo", () => {
  it("la clave es por curso y módulo", () => {
    expect(claveVistos("frontend", "css")).toBe("480:vistos:frontend/css");
  });

  it("sin almacén o sin dato no hay nada visto", () => {
    expect(leerVistos(null, "k").size).toBe(0);
    expect(leerVistos(almacen(), "k").size).toBe(0);
  });

  it("lee los ids guardados e ignora datos corruptos o que no son texto", () => {
    expect([...leerVistos(almacen({ k: '["a","b"]' }), "k")]).toEqual(["a", "b"]);
    expect(leerVistos(almacen({ k: "{roto" }), "k").size).toBe(0);
    expect([...leerVistos(almacen({ k: '["a",3,null]' }), "k")]).toEqual(["a"]);
    expect(leerVistos(almacen({ k: '{"a":1}' }), "k").size).toBe(0);
  });

  it("un almacén que lanza (modo privado, bloqueado) no rompe la lectura ni la escritura", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("lleno");
      },
    };
    expect(leerVistos(roto, "k").size).toBe(0);
    expect(() => guardarVistos(roto, "k", new Set(["a"]))).not.toThrow();
  });

  it("marcar un vídeo lo guarda junto a los que ya estaban, sin repetir", () => {
    const a = almacen({ k: '["a"]' });
    expect([...marcarVisto(a, "k", "b")]).toEqual(["a", "b"]);
    expect([...marcarVisto(a, "k", "b")]).toEqual(["a", "b"]);
    expect(JSON.parse(a.datos.get("k")!)).toEqual(["a", "b"]);
  });
});
