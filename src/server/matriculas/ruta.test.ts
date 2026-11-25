import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { curso, matricula, modulo, progreso, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "../auth/roles";
import { ErrorApp } from "../compartido/errores";
import { cargarAvanceDelCurso, guardarRuta, obtenerRuta } from "./servicio";

const hayBd = await bdPruebasDisponible();

async function errorDe(promesa: Promise<unknown>): Promise<ErrorApp> {
  try {
    await promesa;
  } catch (e) {
    if (e instanceof ErrorApp) return e;
    throw e;
  }
  throw new Error("Se esperaba un ErrorApp");
}

describe.skipIf(!hayBd)("ruta personalizada (con BBDD real)", () => {
  let bd: BdPrueba;
  const sesionDe = async (email: string): Promise<UsuarioSesion> => {
    const [u] = await bd.db.select().from(usuario).where(eq(usuario.email, email));
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, emailVerificado: u.emailVerificado };
  };
  const estadoDe = async (usuarioId: string, slug: string) => {
    const [fila] = await bd.db
      .select({ estado: progreso.estado })
      .from(progreso)
      .innerJoin(modulo, eq(modulo.id, progreso.moduloId))
      .innerJoin(curso, eq(curso.id, modulo.cursoId))
      .where(and(eq(progreso.usuarioId, usuarioId), eq(modulo.slug, slug), eq(curso.slug, "desarrollo-web")));
    return fila?.estado ?? null;
  };

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("obtenerRuta devuelve los módulos en el orden del profesor y, sin ruta, orden null", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const ruta = await obtenerRuta(pablo, "desarrollo-web", bd.db);
    expect(ruta.personalizada).toBe(false);
    expect(ruta.curso).toMatchObject({ slug: "desarrollo-web", titulo: "Introducción al desarrollo web" });
    expect(ruta.modulos.map((m) => m.id)).toEqual(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]);
    expect(ruta.orden).toBeNull();
    expect(ruta.principal).toBeNull();
  });

  it("guardarRuta ordena según las valoraciones, guarda la ruta y devuelve la recomendación del tutor", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const resultado = await guardarRuta(
      pablo,
      "desarrollo-web",
      { valoraciones: { "m4-javascript": "mucho", "m1-html": "sabe" } },
      bd.db,
    );

    expect(resultado.modulos.map((m) => [m.id, m.valoracion])).toEqual([
      ["m4-javascript", "mucho"],
      ["m2-css", "interesa"],
      ["m3-responsive", "interesa"],
      ["m1-html", "sabe"],
    ]);
    expect(resultado.principal).toBe("m4-javascript");
    expect(resultado.recomendacion[0]).toContain("Empezamos por «");

    const [m] = await bd.db
      .select({ orden: matricula.ordenModulos, principal: matricula.moduloPrincipalId })
      .from(matricula)
      .innerJoin(curso, eq(curso.id, matricula.cursoId))
      .where(and(eq(matricula.usuarioId, pablo.id), eq(curso.slug, "desarrollo-web")));
    expect(m.orden).toHaveLength(4);
    expect(m.principal).not.toBeNull();

    const despues = await obtenerRuta(pablo, "desarrollo-web", bd.db);
    expect(despues.personalizada).toBe(true);
    expect(despues.principal).toBe("m4-javascript");
    expect(despues.orden).toEqual(["m4-javascript", "m2-css", "m3-responsive", "m1-html"]);
    // Para valorar, los módulos siempre van en el orden del profesor.
    expect(despues.modulos.map((x) => x.id)).toEqual(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]);
  });

  it("«Ya lo sé» solo cambia el orden: no toca el progreso (el dominado llega al aprobar el test del módulo)", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    expect(await estadoDe(pablo.id, "m1-html")).toBeNull();
    const lucia = await sesionDe("lucia@demo.test");
    expect(await estadoDe(lucia.id, "m2-css")).toBe("en_curso");
    await guardarRuta(lucia, "desarrollo-web", { valoraciones: { "m2-css": "sabe" } }, bd.db);
    expect(await estadoDe(lucia.id, "m2-css")).toBe("en_curso");
  });

  it("rehacerla sustituye la ruta anterior", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const resultado = await guardarRuta(pablo, "desarrollo-web", { valoraciones: { "m2-css": "mucho" } }, bd.db);
    expect(resultado.principal).toBe("m2-css");
    expect((await obtenerRuta(pablo, "desarrollo-web", bd.db)).orden?.[0]).toBe("m2-css");
  });

  it("con un módulo de otro curso responde 400 y no guarda nada", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const antes = await obtenerRuta(pablo, "desarrollo-web", bd.db);
    const error = await errorDe(
      guardarRuta(pablo, "desarrollo-web", { valoraciones: { "no-es-de-este-curso": "mucho" } }, bd.db),
    );
    expect(error.codigo).toBe("DATOS_INVALIDOS");
    expect(await obtenerRuta(pablo, "desarrollo-web", bd.db)).toEqual(antes);
  });

  it("sin el curso responde 403 al leer y al guardar", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    expect((await errorDe(obtenerRuta(pablo, "costura-para-principiantes", bd.db))).codigo).toBe("PROHIBIDO");
    expect(
      (await errorDe(guardarRuta(pablo, "costura-para-principiantes", { valoraciones: {} }, bd.db))).codigo,
    ).toBe("PROHIBIDO");
  });

  it("con un curso que no existe responde 404", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    expect((await errorDe(obtenerRuta(pablo, "no-existe", bd.db))).codigo).toBe("NO_ENCONTRADO");
  });

  it("cargarAvanceDelCurso da la ruta y el progreso del alumno desde la BBDD", async () => {
    const lucia = await sesionDe("lucia@demo.test");
    const avance = await cargarAvanceDelCurso(lucia.id, "desarrollo-web", () => bd.db);
    expect(avance.orden?.[0]).toBe("m1-html"); // la ruta de Lucía del test anterior: css era «sabe» y bajó al final
    expect(avance.orden?.at(-1)).toBe("m2-css");
    expect(avance.progreso).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduloId: "m1-html", estado: "dominado" }),
        expect.objectContaining({ moduloId: "m2-css", estado: "en_curso" }),
      ]),
    );
  });

  it("cargarAvanceDelCurso sin BBDD devuelve una ruta vacía en vez de lanzar", async () => {
    const avance = await cargarAvanceDelCurso("x", "desarrollo-web", () => {
      throw new Error("sin DATABASE_URL");
    });
    expect(avance).toEqual({ orden: null, principal: null, progreso: [] });
  });
});
