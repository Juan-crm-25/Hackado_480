import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BurbujaMensaje, DudasConTutor } from "./chat-tutor";

describe("BurbujaMensaje", () => {
  it("marca con texto, no solo con color, la respuesta fuera del temario", () => {
    const html = renderToStaticMarkup(
      <BurbujaMensaje mensaje={{ rol: "tutor", texto: "Eso no está en el módulo.", fueraDeTemario: true }} videos={[]} />,
    );
    expect(html).toContain("Fuera del temario");
  });

  it("no añade la marca a una respuesta normal", () => {
    const html = renderToStaticMarkup(<BurbujaMensaje mensaje={{ rol: "tutor", texto: "Hola" }} videos={[]} />);
    expect(html).not.toContain("Fuera del temario");
  });
});

describe("tutor humano (H9) en el chat", () => {
  const respuesta = { rol: "tutor" as const, texto: "Por la especificidad", preguntaId: "p1" };

  it("debajo de una respuesta del tutor IA ofrece pasar la duda a un tutor humano", () => {
    const html = renderToStaticMarkup(<BurbujaMensaje mensaje={respuesta} videos={[]} onPasarATutor={() => {}} />);
    expect(html).toContain("¿No te sirve? Pregunta a tu tutor");
  });

  it("no lo ofrece en los errores ni si la pregunta no se guardó", () => {
    expect(renderToStaticMarkup(<BurbujaMensaje mensaje={{ rol: "tutor", texto: "Hola" }} videos={[]} onPasarATutor={() => {}} />)).not.toContain(
      "Pregunta a tu tutor",
    );
    expect(
      renderToStaticMarkup(<BurbujaMensaje mensaje={{ ...respuesta, error: true }} videos={[]} onPasarATutor={() => {}} />),
    ).not.toContain("Pregunta a tu tutor");
  });

  it("una vez enviada, lo confirma en vez del botón", () => {
    const html = renderToStaticMarkup(<BurbujaMensaje mensaje={{ ...respuesta, pasada: "enviada" }} videos={[]} onPasarATutor={() => {}} />);
    expect(html).toContain("Enviada a tu tutor");
    expect(html).not.toContain("¿No te sirve?");
  });

  it("lista las dudas pasadas con su estado en texto y la respuesta del profesor", () => {
    const html = renderToStaticMarkup(
      <DudasConTutor
        dudas={[
          { id: "d1", preguntaId: "p1", pregunta: "¿Un id gana?", moduloId: "m2-css", creada: "2026-11-26T10:00:00Z", estado: "respondida", respuesta: "Sí, siempre.", respondida: "2026-11-26T11:00:00Z" },
          { id: "d2", preguntaId: "p2", pregunta: "¿Y !important?", moduloId: "m2-css", creada: "2026-11-26T12:00:00Z", estado: "pendiente" },
        ]}
      />,
    );
    expect(html).toContain("Tus preguntas a tu tutor");
    expect(html).toContain("Respondido por tu tutor");
    expect(html).toContain("Sí, siempre.");
    expect(html).toContain("Pendiente");
  });

  it("sin dudas pasadas no pinta nada", () => {
    expect(renderToStaticMarkup(<DudasConTutor dudas={[]} />)).toBe("");
  });
});

describe("formato de las respuestas del tutor", () => {
  it("las negritas y las listas en markdown se ven con formato, sin asteriscos", () => {
    const html = renderToStaticMarkup(
      <BurbujaMensaje mensaje={{ rol: "tutor", texto: "El **ID** gana.\n- `#id`: 100\n- `.clase`: 10" }} videos={[]} />,
    );
    expect(html).toContain("<strong>ID</strong>");
    expect(html).not.toContain("**");
    expect(html).toMatch(/<ul[^>]*><li><code/);
  });
});
