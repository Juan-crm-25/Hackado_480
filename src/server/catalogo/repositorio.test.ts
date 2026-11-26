import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { leerCursoPrincipal, leerCursoPublicado, leerCursosPublicados } from "./repositorio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("repositorio del catálogo (con BBDD real)", () => {
  let bd: BdPrueba;

  beforeAll(async () => {
    bd = await crearBdPrueba();
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("sin cursos devuelve null y listas vacías", async () => {
    expect(await leerCursoPrincipal(bd.db)).toBeNull();
    expect(await leerCursosPublicados(bd.db)).toEqual([]);
    expect(await leerCursoPublicado("desarrollo-web", bd.db)).toBeNull();
  });

  it("devuelve el curso con su categoría y los módulos en orden, con sus clases y conceptos", async () => {
    await sembrar(bd.db);
    const curso = await leerCursoPrincipal(bd.db);

    expect(curso).not.toBeNull();
    expect(curso!.titulo).toBe("Introducción al desarrollo web");
    expect(curso!.categoria).toBe("Programación");
    expect(curso!.descripcion.length).toBeGreaterThan(0);
    expect(curso!.modulos.map((m) => m.id)).toEqual(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]);

    const html = curso!.modulos[0];
    expect(html.titulo).toBe("HTML");
    expect(html.conceptos.map((c) => c.id)).toContain("html-semantica");
    expect(html.clases.map((c) => c.id)).toEqual(["v01", "v02", "v03"]);
    expect(html.clases[0]).toMatchObject({
      titulo: "Cómo están hechas las páginas web",
      youtubeId: "81u19umYU_E",
      videoUrl: "https://www.youtube.com/watch?v=81u19umYU_E",
      duracionSegundos: 403,
    });
    expect(curso!.modulos.flatMap((m) => m.clases)).toHaveLength(12);
  });

  it("el curso principal es el de la demo aunque haya más cursos", async () => {
    expect((await leerCursoPrincipal(bd.db))!.id).toBe("desarrollo-web");
  });

  it("lee cualquier curso por su slug, con sus módulos", async () => {
    const python = await leerCursoPrincipal(bd.db, "python-desde-cero");
    expect(python!.id).toBe("python-desde-cero");
    expect(python!.modulos).toHaveLength(3);
  });

  it("lista los 6 cursos publicados con categoría, precio, módulos y estudiantes reales", async () => {
    const cursos = await leerCursosPublicados(bd.db);
    expect(cursos).toHaveLength(6);
    const porSlug = Object.fromEntries(cursos.map((c) => [c.slug, c]));
    expect(porSlug["desarrollo-web"]).toMatchObject({
      titulo: "Introducción al desarrollo web",
      categoria: { slug: "programacion", nombre: "Programación" },
      precioCentimos: 0,
      numModulos: 4,
      numAlumnos: 10, // la profesora no cuenta como estudiante
    });
    expect(porSlug["python-desde-cero"]).toMatchObject({ numModulos: 3, numAlumnos: 7, precioCentimos: 4900 });
    expect(porSlug["ia-generativa-dia-a-dia"]).toMatchObject({ numAlumnos: 5, categoria: { slug: "ia", nombre: "IA" } });
    expect(porSlug["cocina-mediterranea-saludable"]).toMatchObject({ numModulos: 2, numAlumnos: 6 });
    expect(porSlug["costura-para-principiantes"]).toMatchObject({ numAlumnos: 2, precioCentimos: 0 });
    expect(porSlug["oposiciones-auxiliar-administrativo"]).toMatchObject({ numAlumnos: 3 });
    expect(cursos.every((c) => c.descripcion.length > 0)).toBe(true);
    // Banner de cada curso (curso_imagen, uso «banner»), para las tarjetas.
    expect(porSlug["python-desde-cero"].bannerUrl).toBe("/banners/python-desde-cero.webp");
    expect(cursos.every((c) => c.bannerUrl?.startsWith("/banners/"))).toBe(true);
  });

  it("lee un curso publicado por su slug, con sus módulos en orden", async () => {
    const python = await leerCursoPublicado("python-desde-cero", bd.db);
    expect(python).toMatchObject({ slug: "python-desde-cero", numAlumnos: 7, numModulos: 3 });
    expect(python!.modulos.map((m) => m.id)).toEqual(["p1-primeros-pasos", "p2-control", "p3-funciones"]);
    expect(python!.modulos[0].descripcion.length).toBeGreaterThan(0);
    expect(await leerCursoPublicado("no-existe", bd.db)).toBeNull();
  });
});
