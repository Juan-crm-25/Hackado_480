import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ClaseCatalogo } from "@/lib/catalogo-bd";
import type { EjercicioPublico, ResultadoTestVideo } from "@/lib/types";
import { ContadorVisto, CorreccionTestVideo, ReproductorClase, TestVideo, VideosModulo } from "./videos-modulo";

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
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(1);
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

describe("ReproductorClase (fila abierta)", () => {
  it("abrir la fila no la marca como vista: miniatura, aviso de los 15 s y nada anunciado", () => {
    const html = renderToStaticMarkup(
      <ReproductorClase youtubeId="aaaaaaaaaaa" titulo="Selectores" visto={false} onVisto={() => {}} />,
    );
    expect(html).toContain("Reproducir: Selectores");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Se marca como visto tras 15 s de reproducción");
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("Vídeo marcado como visto");
  });
});

describe("ContadorVisto", () => {
  it("mientras se reproduce muestra «Viendo… N s de 15» en texto", () => {
    const html = renderToStaticMarkup(<ContadorVisto segundos={9.4} reproduciendo visto={false} />);
    expect(html).toContain("Viendo… 9 s de 15");
  });

  it("en pausa conserva la cuenta y lo dice", () => {
    const html = renderToStaticMarkup(<ContadorVisto segundos={6} reproduciendo={false} visto={false} />);
    expect(html).toContain("En pausa: 6 s de 15");
  });

  it("sin empezar explica la regla; ya visto no muestra contador", () => {
    expect(renderToStaticMarkup(<ContadorVisto segundos={0} reproduciendo={false} visto={false} />)).toContain(
      "Se marca como visto tras 15 s de reproducción",
    );
    expect(renderToStaticMarkup(<ContadorVisto segundos={3} reproduciendo visto />)).toBe("");
  });
});

describe("VideosModulo (desbloqueo por tests)", () => {
  it("el primer vídeo está abierto y los demás bloqueados hasta superar el test del anterior", () => {
    const html = pintar();
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(html).toContain("Bloqueado · supera el test de «Selectores» para desbloquearlo");
    expect(html).toContain("Bloqueado · supera el test de «Flexbox» para desbloquearlo");
    expect(html.match(/aria-describedby="/g)).toHaveLength(2);
  });

  it("muestra el progreso de los tests junto al de los vídeos", () => {
    expect(pintar()).toContain("0 de 3 tests superados");
  });
});

describe("TestVideo", () => {
  const pregunta = (id: string, tipo: EjercicioPublico["tipo"], opciones?: string[]): EjercicioPublico => ({
    id,
    moduloId: "css",
    conceptoId: "css-selectores",
    tipo,
    enunciado: `Enunciado ${id}`,
    ...(opciones ? { opciones } : {}),
    referencia: { videoId: "c1", segundo: 75 },
  });
  const preguntas = [pregunta("p1", "test", ["Uno", "Dos", "Tres"]), pregunta("p2", "respuesta_corta")];
  const video = { id: "c1", titulo: "Selectores", youtubeId: "aaaaaaaaaaa" };
  const base = { tituloVideo: "Selectores", moduloSlug: "css", video, superado: false, onSuperado: () => {}, onReintentar: () => {} };

  it("pinta las preguntas reales del vídeo (opciones y respuesta corta) y el botón de comprobar", () => {
    const html = renderToStaticMarkup(<TestVideo {...base} preguntas={preguntas} />);
    expect(html).toContain("Test del vídeo");
    expect(html).not.toContain("demostración");
    expect(html).toContain("Enunciado p1");
    expect(html).toContain("Pregunta 2 de 2");
    expect(html.match(/type="radio"/g)).toHaveLength(3);
    expect(html).toMatch(/<input(?![^>]*type="radio")[^>]*>/);
    expect(html).toContain("Comprobar");
  });

  it("mientras carga lo dice; si falla, lo dice con un botón para reintentar", () => {
    expect(renderToStaticMarkup(<TestVideo {...base} preguntas={null} />)).toContain("Cargando el test");
    const error = renderToStaticMarkup(<TestVideo {...base} preguntas={null} error="Sin conexión." />);
    expect(error).toContain("Sin conexión.");
    expect(error).toContain("Reintentar");
  });

  it("un vídeo sin preguntas no tiene test y no bloquea el siguiente", () => {
    expect(renderToStaticMarkup(<TestVideo {...base} preguntas={[]} />)).toContain("todavía no tiene test");
  });

  it("superado lo dice con texto e icono", () => {
    const html = renderToStaticMarkup(<TestVideo {...base} preguntas={preguntas} superado />);
    expect(html).toContain("Test superado");
    expect(html).toMatch(/<svg[^>]*aria-hidden/);
  });
});

describe("CorreccionTestVideo", () => {
  it("cada pregunta con su estado en texto, el feedback y el enlace al minuto del vídeo si ha fallado", () => {
    const resultado: ResultadoTestVideo = {
      superado: false,
      resultados: [
        { ejercicioId: "p1", correcto: true, puntuacion: 1, feedback: "¡Correcto!", revisionHumana: false },
        { ejercicioId: "p2", correcto: false, puntuacion: 0, feedback: "No es correcto.", repasar: { videoId: "c1", segundo: 75 }, revisionHumana: false },
      ],
    };
    const html = renderToStaticMarkup(
      <CorreccionTestVideo resultado={resultado} video={{ id: "c1", titulo: "Selectores", youtubeId: "aaaaaaaaaaa" }} />,
    );
    expect(html).toContain("Pregunta 1: Correcta");
    expect(html).toContain("Pregunta 2: Incorrecta");
    expect(html).toContain("No es correcto.");
    expect(html).toContain("https://www.youtube.com/watch?v=aaaaaaaaaaa&amp;t=75s");
    expect(html).toContain("Selectores · 1:15");
  });
});
