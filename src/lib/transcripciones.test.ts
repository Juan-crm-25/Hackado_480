import { describe, expect, it } from "vitest";
import { agruparFragmentos, parsearVtt, temarioDelModulo } from "./transcripciones";
import type { Modulo } from "./types";

const VTT = `WEBVTT

NOTE
Comentario que se ignora

1
00:00:01.500 --> 00:00:04.000
Hola, <c>bienvenidos</c>

00:01:05.000 --> 00:01:08.000 align:start
Segunda línea
partida en dos

01:00:00,000 --> 01:00:02,000
Con horas y coma`;

describe("parsearVtt", () => {
  it("lee los tiempos, une las líneas y quita etiquetas y notas", () => {
    expect(parsearVtt(VTT)).toEqual([
      { inicio: 1, texto: "Hola, bienvenidos" },
      { inicio: 65, texto: "Segunda línea partida en dos" },
      { inicio: 3600, texto: "Con horas y coma" },
    ]);
  });

  it("acepta saltos de línea de Windows", () => {
    expect(parsearVtt(VTT.replace(/\n/g, "\r\n"))).toHaveLength(3);
  });
});

describe("agruparFragmentos", () => {
  it("une los fragmentos que empiezan dentro de la misma ventana", () => {
    const f = [
      { inicio: 0, texto: "a" },
      { inicio: 10, texto: "b" },
      { inicio: 29, texto: "c" },
      { inicio: 30, texto: "d" },
    ];
    expect(agruparFragmentos(f, 30)).toEqual([
      { inicio: 0, texto: "a b c" },
      { inicio: 30, texto: "d" },
    ]);
  });
});

describe("temarioDelModulo", () => {
  it("pone una marca [vídeo @segundo] por fragmento y salta vídeos sin transcripción", () => {
    const modulo: Modulo = {
      id: "m",
      titulo: "M",
      descripcion: "",
      ordenSugerido: 1,
      conceptos: [],
      videos: [
        { id: "v1", titulo: "Uno", youtubeId: "", duracionSegundos: 60, transcripcion: "v1.vtt" },
        { id: "v2", titulo: "Dos", youtubeId: "", duracionSegundos: 60 },
      ],
    };
    const temario = temarioDelModulo(modulo, () => [{ inicio: 12, texto: "Texto" }]);
    expect(temario).toBe("### Vídeo v1: Uno\n[v1 @12] Texto");
  });
});
