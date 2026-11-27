import { describe, expect, it, vi } from "vitest";
import { ErrorIA } from "../ai/cliente";
import { leerInstrucciones, rellenar } from "./instrucciones";
import {
  type PreguntaCorregible,
  corregir,
  interpretarCorreccion,
  necesitaIA,
  respuestaCortaCoincide,
} from "./corrector";

const repasar = { videoId: "v04", segundo: 135 };

const test: PreguntaCorregible = {
  tipo: "test",
  enunciado: "¿Qué selector tiene más especificidad?",
  opciones: [".boton", "#enviar", "button"],
  solucion: 1,
  referencia: repasar,
};
const corta: PreguntaCorregible = {
  tipo: "respuesta_corta",
  enunciado: "¿Cuántos px mide 3rem si la raíz mide 16px?",
  solucion: "48px",
  referencia: repasar,
};
const abierta: PreguntaCorregible = {
  tipo: "abierta",
  enunciado: "Explica la diferencia entre margin y padding.",
  rubrica: "Completa: padding es espacio interior y margin exterior. Parcial: solo uno de los dos. Incorrecta: los confunde.",
  referencia: { videoId: "v05", segundo: 60 },
};
const codigo: PreguntaCorregible = { ...abierta, tipo: "codigo", enunciado: "Escribe un nav con dos enlaces.", solucion: "<nav>…</nav>" };

/** Dependencias de prueba: la IA responde `texto` (o falla). */
const iaQueResponde = (texto: string) => ({ completar: vi.fn().mockResolvedValue({ texto, simulado: false }) });

describe("necesitaIA", () => {
  it("solo las abiertas y las de código se corrigen con IA (cuentan para el límite diario)", () => {
    expect(["test", "respuesta_corta", "abierta", "codigo"].map((t) => necesitaIA(t as PreguntaCorregible["tipo"]))).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });
});

describe("corregir un test (con código, sin IA)", () => {
  it("acierto: puntuación 1, sin minuto que repasar", async () => {
    const deps = iaQueResponde("{}");
    const r = await corregir(test, 1, {}, deps);
    expect(r).toEqual({ puntuacion: 1, correcto: true, feedback: "¡Correcto!", revisionHumana: false });
    expect(deps.completar).not.toHaveBeenCalled();
  });

  it("fallo: puntuación 0 y el minuto del vídeo que hay que repasar; acepta el índice como texto", async () => {
    expect(await corregir(test, 0)).toEqual({
      puntuacion: 0,
      correcto: false,
      feedback: "No es correcto. Repasa este momento del vídeo.",
      repasar,
      revisionHumana: false,
    });
    expect((await corregir(test, "1")).correcto).toBe(true);
  });

  it("una respuesta vacía o que no es una opción cuenta como fallo", async () => {
    expect((await corregir(test, "")).correcto).toBe(false);
    expect((await corregir(test, 7)).correcto).toBe(false);
    expect((await corregir(test, "abc")).feedback).toMatch(/No has respondido|No es correcto/);
  });
});

describe("respuestaCortaCoincide (corrección flexible)", () => {
  it.each([
    ["Margin", "margin"],
    [" márgin ", "margin"],
    ["48 px", "48px"],
    ["`addEventListener()`", "addEventListener"],
    ["rem.", "rem"],
    ['"clases"', "clases"],
    ["1,5", "1.5"],
    ["16.0", "16"],
  ])("«%s» vale por «%s»", (respuesta, solucion) => {
    expect(respuestaCortaCoincide(respuesta, solucion)).toBe(true);
  });

  it.each([
    ["48", "48px"],
    ["padding", "margin"],
    ["clase", "clases"],
    ["", "margin"],
  ])("«%s» no vale por «%s»", (respuesta, solucion) => {
    expect(respuestaCortaCoincide(respuesta, solucion)).toBe(false);
  });
});

describe("corregir una respuesta corta (con código, sin IA)", () => {
  it("acierta con la corrección flexible y falla con el minuto que repasar", async () => {
    expect(await corregir(corta, " 48 PX ")).toMatchObject({ puntuacion: 1, correcto: true, revisionHumana: false });
    expect(await corregir(corta, "48")).toMatchObject({ puntuacion: 0, correcto: false, repasar });
  });
});

describe("instrucciones del corrector", () => {
  it("se leen de agents/corrector.md y tienen todas las variables", () => {
    const valores = { tipo: "abierta", enunciado: "E", rubrica: "R", solucion: "S" };
    expect(() => rellenar(leerInstrucciones("corrector"), valores)).not.toThrow();
  });
});

describe("interpretarCorreccion", () => {
  it("traduce el nivel a puntuación: completa 1, parcial 0,5 e incorrecta 0; solo la completa es correcta", () => {
    expect(interpretarCorreccion('{"nivel":"completa","feedback":"Bien explicado.","seguro":true}')).toEqual({
      puntuacion: 1,
      correcto: true,
      feedback: "Bien explicado.",
      revisionHumana: false,
    });
    expect(interpretarCorreccion('```json\n{"nivel":"parcial","feedback":"Falta el margin.","seguro":true}\n```')).toMatchObject({
      puntuacion: 0.5,
      correcto: false,
    });
    expect(interpretarCorreccion('{"nivel":"incorrecta","feedback":"Los confundes.","seguro":true}')).toMatchObject({ puntuacion: 0 });
  });

  it("si el modelo no está seguro, la marca para revisión humana", () => {
    expect(interpretarCorreccion('{"nivel":"parcial","feedback":"Dudoso.","seguro":false}')?.revisionHumana).toBe(true);
  });

  it("si no es JSON, falta el nivel o el feedback, devuelve null", () => {
    expect(interpretarCorreccion("no es json")).toBeNull();
    expect(interpretarCorreccion('{"nivel":"genial","feedback":"x","seguro":true}')).toBeNull();
    expect(interpretarCorreccion('{"nivel":"completa","feedback":"  ","seguro":true}')).toBeNull();
  });

  it("recorta un feedback demasiado largo", () => {
    const r = interpretarCorreccion(JSON.stringify({ nivel: "completa", feedback: "a".repeat(2000), seguro: true }));
    expect(r!.feedback.length).toBeLessThanOrEqual(500);
  });
});

describe("corregir una abierta o de código (con IA y la rúbrica)", () => {
  it("manda enunciado, rúbrica y solución de referencia en el sistema, y la respuesta FILTRADA aparte", async () => {
    const deps = iaQueResponde('{"nivel":"parcial","feedback":"Te falta el margin.","seguro":true}');
    const r = await corregir(codigo, "Me llamo Lucía, mi email es lucia@demo.test: <nav><a>1</a></nav>", { nombresOcultos: ["Lucía"] }, deps);

    expect(r).toEqual({
      puntuacion: 0.5,
      correcto: false,
      feedback: "Te falta el margin.",
      repasar: { videoId: "v05", segundo: 60 },
      revisionHumana: false,
    });
    const op = deps.completar.mock.calls[0][0];
    expect(op).toMatchObject({ modelo: "tutor", formatoJson: true });
    expect(op.mensajes[0].contenido).toContain(codigo.rubrica);
    expect(op.mensajes[0].contenido).toContain("<nav>…</nav>");
    const alumno = op.mensajes[1].contenido as string;
    expect(alumno).toContain("<nav><a>1</a></nav>");
    expect(alumno).not.toContain("lucia@demo.test");
    expect(alumno).not.toContain("Lucía");
  });

  it("una respuesta completa no lleva minuto que repasar", async () => {
    const r = await corregir(abierta, "Padding dentro, margin fuera.", {}, iaQueResponde('{"nivel":"completa","feedback":"¡Bien!","seguro":true}'));
    expect(r).toEqual({ puntuacion: 1, correcto: true, feedback: "¡Bien!", revisionHumana: false });
  });

  it("una respuesta vacía no llama a la IA", async () => {
    const deps = iaQueResponde("{}");
    expect(await corregir(abierta, "   ", {}, deps)).toMatchObject({ puntuacion: 0, correcto: false, revisionHumana: false });
    expect(deps.completar).not.toHaveBeenCalled();
  });

  it("si la IA falla, responde mal o está en modo simulado, cuenta 0 y la deja para revisión humana", async () => {
    const esperado = { puntuacion: 0, correcto: false, revisionHumana: true, repasar: { videoId: "v05", segundo: 60 } };
    const falla = { completar: vi.fn().mockRejectedValue(new ErrorIA("caída", 503)) };
    expect(await corregir(abierta, "algo", {}, falla)).toMatchObject(esperado);
    expect(await corregir(abierta, "algo", {}, iaQueResponde("no es json"))).toMatchObject(esperado);
    const simulado = { completar: vi.fn().mockResolvedValue({ texto: "{}", simulado: true }) };
    const r = await corregir(abierta, "algo", {}, simulado);
    expect(r).toMatchObject(esperado);
    expect(r.feedback).toMatch(/profesor/);
  });
});
