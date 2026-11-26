import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { EjercicioPublico, ResultadoTestModulo, TestModulo } from "@/lib/types";
import { PreguntaDelTest, ResultadoDelTest } from "./pantalla-test";

const pregunta = (id: string, tipo: EjercicioPublico["tipo"], opciones?: string[]): EjercicioPublico => ({
  id,
  moduloId: "m2-css",
  conceptoId: "css-caja",
  tipo,
  enunciado: `¿Qué hace \`margin\` en ${id}?`,
  ...(opciones ? { opciones } : {}),
  referencia: { videoId: "v05", segundo: 60 },
});
const videos = [{ id: "v05", titulo: "Modelo de caja", youtubeId: "abc123" }];
const nada = () => {};

describe("PreguntaDelTest", () => {
  it("test: el enunciado (con el código marcado) y una opción por botón de radio, con la elegida marcada", () => {
    const html = renderToStaticMarkup(
      <PreguntaDelTest pregunta={pregunta("a", "test", ["Separa", "Rellena"])} numero={1} total={8} respuesta={1} onCambiar={nada} />,
    );
    expect(html).toContain("Pregunta 1 de 8");
    expect(html).toContain("<code");
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/checked="" value="1"/);
  });

  it("respuesta corta: una línea; código: un cuadro de texto en monoespaciada", () => {
    expect(renderToStaticMarkup(<PreguntaDelTest pregunta={pregunta("b", "respuesta_corta")} numero={2} total={8} respuesta="margin" onCambiar={nada} />)).toMatch(
      /<input[^>]*value="margin"/,
    );
    const codigo = renderToStaticMarkup(<PreguntaDelTest pregunta={pregunta("c", "codigo")} numero={3} total={8} respuesta="" onCambiar={nada} />);
    expect(codigo).toContain("<textarea");
    expect(codigo).toContain("font-mono");
    expect(codigo).toContain("Escribe el código");
  });
});

describe("ResultadoDelTest", () => {
  const test: TestModulo = {
    moduloId: "m2-css",
    firma: "f",
    notaAprobado: 7,
    preguntas: [pregunta("a", "test", ["Separa", "Rellena"]), pregunta("b", "abierta")],
  };
  const resultado: ResultadoTestModulo = {
    nota: 5,
    aprobado: false,
    notaAprobado: 7,
    mejorNota: 5,
    estado: "en_curso",
    resultados: [
      { ejercicioId: "a", correcto: false, puntuacion: 0, feedback: "No es correcto.", repasar: { videoId: "v05", segundo: 60 }, revisionHumana: false },
      { ejercicioId: "b", correcto: false, puntuacion: 0.5, feedback: "Te falta algo.", repasar: { videoId: "v05", segundo: 60 }, revisionHumana: true },
    ],
  };

  it("enseña la nota y si ha aprobado con texto, no solo con color", () => {
    const html = renderToStaticMarkup(<ResultadoDelTest test={test} respuestas={{ a: 1, b: "algo" }} resultado={resultado} videos={videos} />);
    expect(html).toContain("Suspendido");
    expect(html).toContain("5<span");
    expect(html).toContain("Necesitas un 7");
  });

  it("cada pregunta con su estado, la respuesta del alumno, el feedback y el enlace al minuto del vídeo", () => {
    const html = renderToStaticMarkup(<ResultadoDelTest test={test} respuestas={{ a: 1, b: "algo" }} resultado={resultado} videos={videos} />);
    expect(html).toContain("Pregunta 1: Incorrecta");
    expect(html).toContain("Pregunta 2: Parcialmente correcta");
    expect(html).toContain("Tu respuesta: Rellena");
    expect(html).toContain("Te falta algo.");
    expect(html).toContain("https://www.youtube.com/watch?v=abc123&amp;t=60s");
    expect(html).toContain("Modelo de caja · 1:00");
    expect(html).toContain("la revisará tu profesor");
  });
});
