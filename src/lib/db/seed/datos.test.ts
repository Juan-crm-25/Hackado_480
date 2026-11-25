import { describe, expect, it } from "vitest";
import catalogo from "../../../../data/catalog.json";
import m1Html from "../../../../data/ejemplos-profesor/m1-html.json";
import m2Css from "../../../../data/ejemplos-profesor/m2-css.json";
import m3Responsive from "../../../../data/ejemplos-profesor/m3-responsive.json";
import m4Javascript from "../../../../data/ejemplos-profesor/m4-javascript.json";
import { alumnosDemo } from "../../datos-prueba";
import type { Catalogo, PlantillaEjercicios } from "../../types";
import {
  comprobarDestino,
  construirCatalogo,
  construirCatalogos,
  construirMatriculas,
  construirPlantillas,
  construirUsuarios,
  seudonimoDe,
} from "./datos";

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

describe("catálogo completo del seed", () => {
  const catalogos = construirCatalogos(catalogo as Catalogo);

  it("son 6 cursos publicados: el de catalog.json el primero y 5 más de otras categorías", () => {
    expect(catalogos).toHaveLength(6);
    expect(catalogos[0]).toEqual(construirCatalogo(catalogo as Catalogo));
    expect(catalogos.every((c) => c.curso.publicado)).toBe(true);
    const slugs = catalogos.map((c) => c.curso.slug);
    expect(new Set(slugs).size).toBe(6);
    expect(new Set(catalogos.map((c) => c.categoria.slug))).toEqual(
      new Set(["programacion", "ia", "cocina", "costura", "oposiciones"]),
    );
  });

  it("los cursos nuevos tienen descripción, precio válido y 2–3 módulos descritos, sin clases inventadas", () => {
    for (const { curso, modulos } of catalogos.slice(1)) {
      expect(curso.descripcion.length).toBeGreaterThan(0);
      expect(Number.isInteger(curso.precioCentimos) && curso.precioCentimos >= 0).toBe(true);
      expect(modulos.length).toBeGreaterThanOrEqual(2);
      expect(modulos.length).toBeLessThanOrEqual(3);
      expect(modulos.every((m) => m.descripcion.length > 0 && m.clases.length === 0)).toBe(true);
      expect(modulos.map((m) => m.ordenSugerido)).toEqual(modulos.map((_, i) => i + 1));
    }
    const gratis = catalogos.slice(1).filter((c) => c.curso.precioCentimos === 0);
    expect(gratis.length).toBeGreaterThanOrEqual(1);
    expect(gratis.length).toBeLessThanOrEqual(2);
  });

  it("una misma categoría tiene siempre el mismo nombre", () => {
    const programacion = catalogos.filter((c) => c.categoria.slug === "programacion").map((c) => c.categoria.nombre);
    expect(new Set(programacion)).toEqual(new Set(["Programación"]));
  });
});

describe("matrículas del seed", () => {
  const usuarios = construirUsuarios(alumnosDemo);
  const catalogos = construirCatalogos(catalogo as Catalogo);
  const matriculas = construirMatriculas(catalogos, usuarios);
  const alumnosDe = (slug: string) =>
    matriculas.filter((m) => m.cursoSlug === slug && m.rolEnCurso === "alumno").map((m) => m.email);

  it("el curso de la demo tiene a los 10 alumnos y a la profesora; el admin no se matricula", () => {
    expect(alumnosDe("desarrollo-web")).toHaveLength(10);
    expect(matriculas.filter((m) => m.rolEnCurso === "profesor")).toEqual([
      { cursoSlug: "desarrollo-web", email: "profesora@demo.test", rolEnCurso: "profesor" },
    ]);
    expect(matriculas.some((m) => m.email === "admin@demo.test")).toBe(false);
  });

  it("los otros cursos tienen alumnos de la demo, en número distinto en cada uno", () => {
    const alumnos = new Set(usuarios.filter((u) => u.rol === "alumno").map((u) => u.email));
    const cuentas = catalogos.map((c) => alumnosDe(c.curso.slug).length);
    expect(new Set(cuentas).size).toBe(cuentas.length);
    expect(matriculas.every((m) => m.rolEnCurso === "profesor" || alumnos.has(m.email))).toBe(true);
    expect(cuentas.every((n) => n > 0)).toBe(true);
  });

  it("no repite matrícula (curso, email)", () => {
    const claves = matriculas.map((m) => `${m.cursoSlug}|${m.email}`);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("plantillas de ejercicios del seed", () => {
  const cursoDemo = construirCatalogo(catalogo as Catalogo);
  const ficheros = [m1Html, m2Css, m3Responsive, m4Javascript] as PlantillaEjercicios[];
  const plantillas = construirPlantillas(cursoDemo, ficheros);

  it("da una plantilla por cada módulo del curso de la demo, en su curso", () => {
    expect(plantillas.map((p) => p.moduloSlug)).toEqual(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]);
    expect(plantillas.every((p) => p.cursoSlug === "desarrollo-web")).toBe(true);
  });

  it("copia tal cual los tipos, los ejemplos y las indicaciones del fichero", () => {
    const css = plantillas.find((p) => p.moduloSlug === "m2-css")!;
    expect(css).toEqual({
      cursoSlug: "desarrollo-web",
      moduloSlug: "m2-css",
      tipos: m2Css.tipos,
      ejemplos: m2Css.ejemplos,
      indicaciones: m2Css.indicaciones,
    });
  });

  it("sin indicaciones en el fichero, guarda null (la columna admite vacío)", () => {
    const sinIndicaciones: PlantillaEjercicios = { ...(m2Css as PlantillaEjercicios), indicaciones: undefined };
    expect(construirPlantillas(cursoDemo, [sinIndicaciones])[0].indicaciones).toBeNull();
  });

  it("falla con un mensaje claro si un fichero es de un módulo que no está en el curso", () => {
    const desconocido = { ...(m2Css as PlantillaEjercicios), moduloId: "m9-inventado" };
    expect(() => construirPlantillas(cursoDemo, [desconocido])).toThrow(/m9-inventado/);
  });

  it("falla si dos ficheros son del mismo módulo (solo cabe una plantilla por módulo)", () => {
    expect(() => construirPlantillas(cursoDemo, [m2Css, m2Css] as PlantillaEjercicios[])).toThrow(/m2-css/);
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
