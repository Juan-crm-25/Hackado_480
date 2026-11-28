import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EstudioVideo } from "@/lib/types";
import { ContenidoEstudio, PanelEstudio } from "./panel-estudio";

const video = { id: "v04", titulo: "Especificidad y cascada", youtubeId: "abc123" };
const estudio: EstudioVideo = {
  moduloId: "m2-css",
  videoId: "v04",
  transcripcion: [
    { inicio: 1, texto: "En este vídeo vemos la especificidad." },
    { inicio: 95, texto: "Un id gana a una clase." },
  ],
  resumen: [],
  tarjetas: [],
  infografias: [],
};

describe("PanelEstudio", () => {
  it("plegado: solo el botón para abrirlo (no pide nada hasta que se abre)", () => {
    const html = renderToStaticMarkup(<PanelEstudio moduloSlug="m2-css" video={video} />);
    expect(html).toContain("Estudiar este vídeo");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="tablist"');
  });
});

describe("ContenidoEstudio", () => {
  it("cuatro pestañas: Transcripción, Resumen, Tarjetas y Diagrama", () => {
    const html = renderToStaticMarkup(<ContenidoEstudio estudio={estudio} video={video} />);
    expect(html).toContain('role="tablist"');
    for (const p of ["Transcripción", "Resumen", "Tarjetas", "Diagrama"]) expect(html).toContain(`>${p}<`);
  });

  it("la transcripción, con cada bloque enlazado a su minuto del vídeo", () => {
    const html = renderToStaticMarkup(<ContenidoEstudio estudio={estudio} video={video} />);
    expect(html).toContain("Un id gana a una clase.");
    expect(html).toContain("https://www.youtube.com/watch?v=abc123&amp;t=95s");
    expect(html).toContain("1:35");
  });

  it("sin transcripción lo dice, en vez de quedarse en blanco", () => {
    const html = renderToStaticMarkup(<ContenidoEstudio estudio={{ ...estudio, transcripcion: [] }} video={video} />);
    expect(html).toContain("todavía no tiene transcripción");
  });

  it("si una pestaña no tiene nada revisado, lo dice al abrirla", () => {
    const html = renderToStaticMarkup(<ContenidoEstudio estudio={estudio} video={video} pestanaInicial="resumen" />);
    expect(html).toContain("todavía no tiene resumen revisado");
  });
});
