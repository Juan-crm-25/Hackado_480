import { describe, expect, it } from "vitest";
import { claveTests, desbloqueadas, leerSuperados, superarTest } from "./tests-modulo";

function almacenEnMemoria() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

const clases = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("desbloqueadas", () => {
  it("sin tests superados solo está abierto el primer vídeo", () => {
    expect([...desbloqueadas(clases, new Set())]).toEqual(["a"]);
  });

  it("un vídeo sin test no bloquea el siguiente", () => {
    expect([...desbloqueadas(clases, new Set(), new Set(["a"]))]).toEqual(["a", "b"]);
    expect([...desbloqueadas(clases, new Set(["a"]), new Set(["b"]))]).toEqual(["a", "b", "c"]);
  });

  it("superar el test de un vídeo desbloquea el siguiente, sin necesidad de verlo", () => {
    expect([...desbloqueadas(clases, new Set(["a"]))]).toEqual(["a", "b"]);
    expect([...desbloqueadas(clases, new Set(["a", "b"]))]).toEqual(["a", "b", "c"]);
  });

  it("un vídeo solo se abre si el test del anterior está superado", () => {
    expect([...desbloqueadas(clases, new Set(["b"]))]).toEqual(["a", "c"]);
  });

  it("sin clases no hay nada", () => {
    expect(desbloqueadas([], new Set()).size).toBe(0);
  });
});

describe("tests superados en el navegador", () => {
  it("la clave va por curso y módulo", () => {
    expect(claveTests("frontend", "css")).toBe("480:tests:frontend/css");
  });

  it("guarda y lee los ids superados", () => {
    const almacen = almacenEnMemoria();
    const clave = claveTests("frontend", "css");
    expect(leerSuperados(almacen, clave).size).toBe(0);
    superarTest(almacen, clave, "v01");
    superarTest(almacen, clave, "v01");
    expect([...leerSuperados(almacen, clave)]).toEqual(["v01"]);
  });

  it("con el almacenamiento bloqueado no falla y no hay nada superado", () => {
    const roto = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(() => superarTest(roto, "k", "v01")).not.toThrow();
    expect(leerSuperados(roto, "k").size).toBe(0);
    expect(leerSuperados(null, "k").size).toBe(0);
  });
});
