import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClaseCatalogo } from "@/lib/catalogo-bd";
import { VideosModulo } from "./videos-modulo";

const clases: ClaseCatalogo[] = [
  { id: "c1", titulo: "Selectores", videoUrl: "https://youtu.be/aaaaaaaaaaa", youtubeId: "aaaaaaaaaaa", duracionSegundos: 403 },
  { id: "c2", titulo: "Flexbox", videoUrl: "https://youtu.be/bbbbbbbbbbb", youtubeId: "bbbbbbbbbbb", duracionSegundos: 600 },
  { id: "c3", titulo: "Grid", videoUrl: "https://vimeo.com/1", youtubeId: null, duracionSegundos: 60 },
];

function pintar() {
  return renderToStaticMarkup(<VideosModulo cursoSlug="frontend" moduloSlug="css" clases={clases} />);
}

describe("VideosModulo (acordeón)", () => {
  it("una fila plegada por clase, con su título y duración", () => {
    const html = pintar();
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3);
    expect(html).not.toContain('aria-expanded="true"');
    for (const c of clases) expect(html).toContain(c.titulo);
    expect(html).toContain("6:43");
    expect(html.match(/aria-controls="/g)).toHaveLength(3);
  });

  it("plegado no carga ni el reproductor ni la miniatura", () => {
    const html = pintar();
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("ytimg.com");
    expect(html).not.toContain("Reproducir");
  });

  it("en el servidor nada está visto: progreso «0 de 3» con su barra", () => {
    const html = pintar();
    expect(html).toContain("0 de 3 vídeos vistos");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("No visto");
    expect(html).not.toMatch(/>Visto</);
  });

  it("los botones de las filas son de 44 px y con foco visible", () => {
    const html = pintar();
    expect(html).toContain("min-h-11");
    expect(html).toContain("focus-visible:ring-ring");
  });
});
