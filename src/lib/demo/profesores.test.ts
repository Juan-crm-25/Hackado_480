import { describe, expect, it } from "vitest";
import { conversacionesDemo } from "./mensajes";
import { profesorDelCurso } from "./profesores";

describe("profesores de ejemplo", () => {
  it("el curso de la demo lo da Ana Torres, con rol, bio, experiencia y 2-3 especialidades", () => {
    const p = profesorDelCurso("desarrollo-web");
    expect(p.nombre).toBe("Ana Torres");
    expect(p.tratamiento).toBe("Tu profesora");
    expect(p.rol.length).toBeGreaterThan(0);
    expect(p.bio.length).toBeGreaterThan(0);
    expect(p.anosExperiencia).toBeGreaterThan(0);
    expect(p.especialidades.length).toBeGreaterThanOrEqual(2);
    expect(p.especialidades.length).toBeLessThanOrEqual(3);
  });

  it("su conversación existe en la bandeja de ejemplo", () => {
    const p = profesorDelCurso("desarrollo-web");
    expect(conversacionesDemo.some((c) => c.id === p.conversacion)).toBe(true);
  });

  it("un curso sin ficha devuelve un profesor genérico, nunca nada", () => {
    const p = profesorDelCurso("curso-que-no-existe");
    expect(p.nombre.length).toBeGreaterThan(0);
    expect(p.conversacion.length).toBeGreaterThan(0);
  });
});
