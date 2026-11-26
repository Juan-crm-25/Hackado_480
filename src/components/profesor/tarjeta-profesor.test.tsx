import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { profesorDelCurso } from "@/lib/demo/profesores";
import { TarjetaProfesor } from "./tarjeta-profesor";

describe("tarjeta del profesor del curso", () => {
  const p = profesorDelCurso("desarrollo-web");
  const html = renderToStaticMarkup(<TarjetaProfesor profesor={p} />);

  it("muestra el tratamiento, el nombre, sus iniciales y a qué se dedica", () => {
    expect(html).toContain("Tu profesora");
    expect(html).toContain("Ana Torres");
    expect(html).toContain(">AT<");
    expect(html).toContain(p.rol);
  });

  it("muestra la bio, la experiencia, las especialidades y el tiempo de respuesta", () => {
    expect(html).toContain(p.bio);
    expect(html).toContain(`${p.anosExperiencia} años`);
    for (const e of p.especialidades) expect(html).toContain(e);
    expect(html).toContain(p.respuesta);
  });

  it("lleva el botón «Enviar mensaje»", () => {
    expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>).)*Enviar mensaje/);
  });
});
