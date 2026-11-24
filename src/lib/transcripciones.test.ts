import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  agruparFragmentos,
  fragmentosAMarkdown,
  marcaMinuto,
  parsearMarkdown,
  parsearVtt,
  temarioDelModulo,
  vttAMarkdown,
} from "./transcripciones";
import type { Catalogo, Modulo } from "./types";

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

describe("marcaMinuto", () => {
  it("escribe siempre [mm:ss], sin horas", () => {
    expect(marcaMinuto(0)).toBe("[00:00]");
    expect(marcaMinuto(94.7)).toBe("[01:34]");
    expect(marcaMinuto(4510)).toBe("[75:10]");
  });
});

describe("fragmentosAMarkdown y parsearMarkdown", () => {
  const video = { id: "v04", titulo: "Especificidad y cascada" };
  const fragmentos = [
    { inicio: 1, texto: "en este vídeo vamos a ver" },
    { inicio: 94, texto: "la especificidad cuando dos reglas" },
  ];

  it("escribe un título y una línea [mm:ss] por fragmento", () => {
    expect(fragmentosAMarkdown(video, fragmentos)).toBe(
      "## Vídeo v04: Especificidad y cascada\n\n[00:01] en este vídeo vamos a ver\n[01:34] la especificidad cuando dos reglas\n",
    );
  });

  it("lee de vuelta los mismos fragmentos", () => {
    expect(parsearMarkdown(fragmentosAMarkdown(video, fragmentos))).toEqual(fragmentos);
  });

  it("acepta minutos de más de dos cifras y saltos de línea de Windows", () => {
    expect(parsearMarkdown("## Vídeo\r\n[75:10] largo\r\n")).toEqual([{ inicio: 4510, texto: "largo" }]);
  });

  it("une al fragmento anterior el texto que va sin marca", () => {
    expect(parsearMarkdown("[00:05] una frase\npartida en dos\n\n[00:20] otra")).toEqual([
      { inicio: 5, texto: "una frase partida en dos" },
      { inicio: 20, texto: "otra" },
    ]);
  });

  it("vttAMarkdown convierte un VTT directamente", () => {
    expect(vttAMarkdown({ id: "v1", titulo: "Uno" }, VTT)).toBe(
      "## Vídeo v1: Uno\n\n[00:01] Hola, bienvenidos\n[01:05] Segunda línea partida en dos\n[60:00] Con horas y coma\n",
    );
  });
});

// Mientras existan los ficheros de data/ (origen del seed): las 12 transcripciones reales
// pasan a markdown y vuelven sin perder ni un segundo ni una palabra.
const CATALOGO = path.join(process.cwd(), "data", "catalog.json");

const videosReales = existsSync(CATALOGO)
  ? (JSON.parse(readFileSync(CATALOGO, "utf8")) as Catalogo).curso.modulos
      .flatMap((m) => m.videos)
      .filter((v) => v.transcripcion)
  : [];

describe.skipIf(videosReales.length === 0)("transcripciones reales: VTT → markdown → fragmentos", () => {
  const videos = videosReales;

  it.each(videos.map((v) => [v.id, v] as const))("%s", (_id, video) => {
    const vtt = readFileSync(path.join(process.cwd(), "data", "transcripciones", video.transcripcion!), "utf8");
    const md = vttAMarkdown(video, vtt);
    expect(md.startsWith(`## Vídeo ${video.id}: ${video.titulo}\n`)).toBe(true);
    expect(parsearMarkdown(md)).toEqual(parsearVtt(vtt));
  });
});
