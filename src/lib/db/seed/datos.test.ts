import { describe, expect, it } from "vitest";
import catalogo from "../../../../data/catalog.json";
import { alumnosDemo } from "../../datos-prueba";
import type { Catalogo } from "../../types";
import { comprobarDestino, construirCatalogo, construirUsuarios, seudonimoDe } from "./datos";

describe("usuarios del seed", () => {
  const usuarios = construirUsuarios(alumnosDemo);
  const alumnos = usuarios.filter((u) => u.rol === "alumno");

  it("crea exactamente 10 alumnos, 1 profesor y 1 admin, todos verificados", () => {
    expect(alumnos).toHaveLength(10);
    expect(usuarios.filter((u) => u.rol === "profesor")).toHaveLength(1);
    expect(usuarios.filter((u) => u.rol === "admin")).toHaveLength(1);
    expect(usuarios.every((u) => u.emailVerificado)).toBe(true);
  });

  it("los dos primeros alumnos son los de la demo, con sus mismos datos", () => {
    alumnosDemo.forEach((demo, i) => {
      expect(alumnos[i]).toMatchObject({
        nombre: demo.nombre,
        email: demo.email,
        esMenor: demo.esMenor,
        consentimientoTutorLegal: demo.consentimientoTutorLegal,
      });
    });
  });

  it("usa emails en minúsculas, únicos y de prueba", () => {
    const emails = usuarios.map((u) => u.email);
    expect(emails.every((e) => e === e.toLowerCase() && e.endsWith("@demo.test"))).toBe(true);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it("da a cada usuario un seudónimo único y estable (derivado del email)", () => {
    const seudonimos = usuarios.map((u) => u.seudonimo);
    expect(new Set(seudonimos).size).toBe(seudonimos.length);
    expect(construirUsuarios(alumnosDemo).map((u) => u.seudonimo)).toEqual(seudonimos);
    expect(seudonimoDe("lucia@demo.test", "alumno")).toBe(alumnos[0].seudonimo);
    expect(seudonimos.join(" ")).not.toMatch(/lucia|pablo/i);
  });
});

describe("catálogo del seed", () => {
  const datos = construirCatalogo(catalogo as Catalogo);

  it("crea la categoría y el curso gratuito y publicado a partir de catalog.json", () => {
    expect(datos.categoria).toEqual({ slug: "programacion", nombre: "Programación" });
    expect(datos.curso).toMatchObject({
      slug: "desarrollo-web",
      titulo: "Introducción al desarrollo web",
      precioCentimos: 0,
      publicado: true,
    });
  });

  it("convierte cada módulo con su orden, sus conceptos y sus vídeos como clases", () => {
    expect(datos.modulos.map((m) => m.slug)).toEqual(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]);
    const css = datos.modulos.find((m) => m.slug === "m2-css")!;
    expect(css.ordenSugerido).toBe(2);
    expect(css.conceptos.map((c) => c.slug)).toEqual(["css-especificidad", "css-caja", "css-unidades"]);
    expect(css.conceptos[0]).toEqual({ slug: "css-especificidad", nombre: "Selectores y especificidad" });
    expect(css.clases[0]).toEqual({
      slug: "v04",
      titulo: "Especificidad y cascada",
      videoUrl: "https://www.youtube.com/watch?v=6fh7ZTj2t2k",
      duracionSegundos: 972,
      orden: 1,
    });
    expect(css.clases.map((c) => c.orden)).toEqual([1, 2, 3]);
  });
});

describe("destino del seed", () => {
  it("acepta la BBDD local", () => {
    expect(comprobarDestino("postgres://hackado:hackado@localhost:5433/hackado", false)).toEqual({ permitido: true });
    expect(comprobarDestino("postgres://u:p@127.0.0.1:5433/x", false)).toEqual({ permitido: true });
  });

  it("rechaza una BBDD remota salvo que se permita a propósito", () => {
    const remota = "postgres://u:p@ep-algo-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
    const rechazo = comprobarDestino(remota, false);
    expect(rechazo.permitido).toBe(false);
    expect(rechazo.motivo).toMatch(/SEED_PERMITIR_REMOTO=1/);
    expect(rechazo.motivo).not.toContain("u:p@");
    expect(comprobarDestino(remota, true)).toEqual({ permitido: true });
  });

  it("rechaza una URL que falta o no se entiende", () => {
    expect(comprobarDestino(undefined, true).permitido).toBe(false);
    expect(comprobarDestino("no es una url", true).permitido).toBe(false);
  });
});
