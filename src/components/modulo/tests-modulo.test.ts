import { describe, expect, it } from "vitest";
import { claveTests, desbloqueadas, esCorrecta, leerSuperados, superarTest } from "./tests-modulo";
import { preguntaDeClase, TESTS_DEMO } from "./tests-demo";

function almacenEnMemoria() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

const clases = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("desbloqueadas", () => {
  it("sin tests superados solo está abierto el primer vídeo", () => {
    expect([...desbloqueadas(clases, new Set())]).toEqual(["a"]);
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

describe("preguntas de demostración", () => {
  it("hay una pregunta de 3 opciones con una correcta para cada vídeo del curso de demostración", () => {
    for (let n = 1; n <= 12; n++) {
      const id = `v${String(n).padStart(2, "0")}`;
      const pregunta = TESTS_DEMO[id];
      expect(pregunta, id).toBeDefined();
      expect(pregunta.opciones).toHaveLength(3);
      expect([0, 1, 2]).toContain(pregunta.correcta);
    }
  });

  it("un id desconocido recibe la pregunta genérica", () => {
    const pregunta = preguntaDeClase("desconocido");
    expect(pregunta.opciones).toHaveLength(3);
    expect(pregunta.enunciado).toBeTruthy();
    expect(preguntaDeClase("v01")).toBe(TESTS_DEMO.v01);
  });

  it("esCorrecta solo acepta la opción correcta", () => {
    const pregunta = TESTS_DEMO.v01;
    expect(esCorrecta(pregunta, pregunta.correcta)).toBe(true);
    expect(esCorrecta(pregunta, (pregunta.correcta + 1) % 3)).toBe(false);
    expect(esCorrecta(pregunta, null)).toBe(false);
  });
});
