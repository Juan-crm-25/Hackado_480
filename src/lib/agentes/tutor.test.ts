import { describe, expect, it, vi } from "vitest";
import type { OpcionesCompletar } from "../ai/cliente";
import type { Curso, Modulo } from "../types";
import { extraerPrompt, leerInstrucciones, rellenar } from "./instrucciones";
import { interpretarRespuesta, MAX_HISTORIAL, preguntarAlTutor } from "./tutor";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [],
  videos: [
    { id: "v04", titulo: "Especificidad", youtubeId: "", duracionSegundos: 200, transcripcion: "v04.vtt" },
    { id: "v05", titulo: "Caja", youtubeId: "", duracionSegundos: 0 },
  ],
};
const curso = { id: "c", titulo: "Desarrollo web", descripcion: "", modulos: [modulo] } satisfies Curso;

describe("instrucciones del tutor", () => {
  it("se leen de agents/tutor.md y tienen todas las variables", () => {
    const prompt = leerInstrucciones("tutor");
    expect(prompt).toContain("{{temario}}");
    expect(() => rellenar(prompt, { modulo: "CSS", curso: "Web", otros_modulos: "-", temario: "T" })).not.toThrow();
  });

  it("falla si falta una variable o el bloque", () => {
    expect(() => rellenar("Hola {{x}}", {})).toThrow(/x/);
    expect(() => extraerPrompt("sin bloque")).toThrow();
  });
});

describe("interpretarRespuesta", () => {
  it("lee el JSON, también dentro de un bloque ```json", () => {
    const r = interpretarRespuesta('```json\n{"respuesta":"Hola","fuera_de_temario":false,"fuentes":[{"videoId":"v04","segundo":125}]}\n```', modulo);
    expect(r).toEqual({ respuesta: "Hola", fueraDeTemario: false, fuentes: [{ videoId: "v04", segundo: 125 }] });
  });

  it("descarta fuentes inventadas, ajusta segundos y quita duplicados", () => {
    const r = interpretarRespuesta(
      JSON.stringify({
        respuesta: "x",
        fuentes: [
          { videoId: "v99", segundo: 10 },
          { videoId: "v04", segundo: 999 },
          { videoId: "v04", segundo: 200 },
          { videoId: "v04", segundo: -5 },
          { videoId: "v05", segundo: 40.6 },
          { videoId: "v04", segundo: "abc" },
        ],
      }),
      modulo,
    );
    expect(r.fuentes).toEqual([
      { videoId: "v04", segundo: 200 },
      { videoId: "v04", segundo: 0 },
      { videoId: "v05", segundo: 41 },
    ]);
  });

  it("si está fuera del temario, no da fuentes", () => {
    const r = interpretarRespuesta('{"respuesta":"No está en el módulo","fuera_de_temario":true,"fuentes":[{"videoId":"v04","segundo":1}]}', modulo);
    expect(r.fueraDeTemario).toBe(true);
    expect(r.fuentes).toEqual([]);
  });

  it("quita el nombre del campo si el modelo lo copia en el texto", () => {
    const r = interpretarRespuesta('{"respuesta":"fuera_de_temario: true, lo siento, no está aquí.","fuera_de_temario":true}', modulo);
    expect(r.respuesta).toBe("Lo siento, no está aquí.");
  });

  it("arregla respuestas con el formato roto", () => {
    // Caso real de gemma-4 al preguntar por flexbox en el módulo de CSS
    const roto = '{"respuesta":"\\"explicación\\": \\"Lo siento, eso está en el módulo «Maquetación responsive».\\"}","fuera_de_temario":true}';
    expect(interpretarRespuesta(roto, modulo).respuesta).toBe("Lo siento, eso está en el módulo «Maquetación responsive».");

    const sinCerrar = 'Aquí va: {"respuesta": "El id gana", "fuera_de_temario": false, "fuentes": [';
    expect(interpretarRespuesta(sinCerrar, modulo)).toMatchObject({ respuesta: "El id gana", fueraDeTemario: false });
  });

  it("cierra las comillas «» que el modelo deja mal", () => {
    expect(interpretarRespuesta('{"respuesta":"Está en el módulo «Maquetación responsive\\"."}', modulo).respuesta).toBe(
      "Está en el módulo «Maquetación responsive».",
    );
    expect(interpretarRespuesta('{"respuesta":"Está en el módulo «Maquetación responsive."}', modulo).respuesta).toBe(
      "Está en el módulo «Maquetación responsive».",
    );
  });

  it("si no es JSON, usa el texto tal cual", () => {
    expect(interpretarRespuesta("Respuesta en texto", modulo)).toEqual({ respuesta: "Respuesta en texto", fueraDeTemario: false, fuentes: [] });
  });
});

describe("preguntarAlTutor", () => {
  it("envía el temario y la pregunta filtrada, sin el nombre del alumno", async () => {
    const completar = vi.fn<(op: OpcionesCompletar) => Promise<{ texto: string; simulado: boolean }>>(async () => ({
      texto: '{"respuesta":"Gana el id","fuera_de_temario":false,"fuentes":[{"videoId":"v04","segundo":125}]}',
      simulado: false,
    }));
    const historial = Array.from({ length: 10 }, (_, i) => ({ rol: i % 2 ? ("tutor" as const) : ("alumno" as const), texto: `m${i} Lucía` }));

    const salida = await preguntarAlTutor(
      { curso, modulo, pregunta: "Soy Lucía Martín (lucia@x.com), ¿por qué gana #enviar?", historial, nombresOcultos: ["Lucía Martín"] },
      { completar, temario: () => "[v04 @125] Un id gana a una clase" },
    );

    expect(salida).toEqual({
      mensaje: { rol: "tutor", texto: "Gana el id", fuentes: [{ videoId: "v04", segundo: 125 }] },
      fueraDeTemario: false,
      simulado: false,
    });

    const op = completar.mock.calls[0][0];
    expect(op.modelo).toBe("tutor");
    expect(op.formatoJson).toBe(true);
    expect(op.mensajes[0].rol).toBe("sistema");
    expect(op.mensajes[0].contenido).toContain("[v04 @125] Un id gana a una clase");
    expect(op.mensajes[0].contenido).toContain("«CSS»");
    expect(op.mensajes).toHaveLength(1 + MAX_HISTORIAL + 1);
    expect(op.mensajes.at(-1)?.contenido).toBe("Soy [NOMBRE] ([EMAIL]), ¿por qué gana #enviar?");
    expect(JSON.stringify(op.mensajes)).not.toMatch(/Lucía|lucia@/);
  });

  it("sin transcripciones no llama a la IA y lo explica", async () => {
    const completar = vi.fn();
    const salida = await preguntarAlTutor({ curso, modulo, pregunta: "hola", nombresOcultos: [] }, { completar, temario: () => "" });
    expect(completar).not.toHaveBeenCalled();
    expect(salida.mensaje.texto).toMatch(/Todavía no tengo el contenido/);
  });

  it("en modo simulado responde sin inventar fuentes", async () => {
    const salida = await preguntarAlTutor(
      { curso, modulo, pregunta: "hola", nombresOcultos: [] },
      { completar: async () => ({ texto: "{}", simulado: true }), temario: () => "[v04 @0] x" },
    );
    expect(salida.simulado).toBe(true);
    expect(salida.mensaje.fuentes).toEqual([]);
  });
});
