import { describe, expect, it } from "vitest";
import { ASISTENTE_INICIAL, avanceAsistente, elegir, estaTerminado, volver } from "./asistente-ruta";

const TOTAL = 3;

describe("asistente de la ruta (carrusel)", () => {
  it("empieza en el primer módulo, sin respuestas y con la barra a 0", () => {
    expect(ASISTENTE_INICIAL).toEqual({ indice: 0, valoraciones: {} });
    expect(avanceAsistente(ASISTENTE_INICIAL, TOTAL)).toBe(0);
    expect(estaTerminado(ASISTENTE_INICIAL, TOTAL)).toBe(false);
  });

  it("al contestar guarda la respuesta, pasa al siguiente módulo y llena la barra", () => {
    const uno = elegir(ASISTENTE_INICIAL, "html", "mucho", TOTAL);
    expect(uno).toEqual({ indice: 1, valoraciones: { html: "mucho" } });
    expect(avanceAsistente(uno, TOTAL)).toBe(33);
  });

  it("al contestar el último termina con la barra llena", () => {
    let estado = elegir(ASISTENTE_INICIAL, "html", "mucho", TOTAL);
    estado = elegir(estado, "css", "sabe", TOTAL);
    estado = elegir(estado, "js", "interesa", TOTAL);
    expect(estaTerminado(estado, TOTAL)).toBe(true);
    expect(avanceAsistente(estado, TOTAL)).toBe(100);
    expect(estado.valoraciones).toEqual({ html: "mucho", css: "sabe", js: "interesa" });
  });

  it("volver atrás conserva las respuestas y permite cambiarlas", () => {
    const dos = elegir(elegir(ASISTENTE_INICIAL, "html", "mucho", TOTAL), "css", "sabe", TOTAL);
    const atras = volver(dos);
    expect(atras).toEqual({ indice: 1, valoraciones: { html: "mucho", css: "sabe" } });
    expect(elegir(atras, "css", "interesa", TOTAL)).toEqual({ indice: 2, valoraciones: { html: "mucho", css: "interesa" } });
  });

  it("no se puede ir antes del primero ni pasar del final", () => {
    expect(volver(ASISTENTE_INICIAL).indice).toBe(0);
    const fin = { indice: TOTAL, valoraciones: { html: "mucho" as const } };
    expect(elegir(fin, "js", "sabe", TOTAL).indice).toBe(TOTAL);
  });

  it("un curso sin módulos ya está terminado", () => {
    expect(estaTerminado(ASISTENTE_INICIAL, 0)).toBe(true);
    expect(avanceAsistente(ASISTENTE_INICIAL, 0)).toBe(100);
  });
});
