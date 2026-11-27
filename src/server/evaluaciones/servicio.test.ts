import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { curso, matricula, modulo, progreso, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "../auth/roles";
import { ErrorApp } from "../compartido/errores";
import { obtenerDiagnosticoModulo, responderDiagnosticoModulo } from "./servicio";

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

describe.skipIf(!hayBd)("diagnóstico rápido por módulo (con BBDD real)", () => {
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

  it("obtenerDiagnosticoModulo devuelve 3 preguntas sin revelar la respuesta correcta", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const diag = await obtenerDiagnosticoModulo(pablo, "m2-css", bd.db);

    expect(diag.modulo).toEqual({ id: "m2-css", titulo: "CSS" });
    expect(diag.preguntas).toHaveLength(3);
    expect("correcta" in diag.preguntas[0]).toBe(false);
  });

  it("si falla alguna pregunta, no marca el módulo como dominado", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const res = await responderDiagnosticoModulo(
      pablo,
      "m2-css",
      { respuestas: { "diag-css-1": 0, "diag-css-2": 1, "diag-css-3": 2 } },
      bd.db,
    );

    expect(res.dominado).toBe(false);
    expect(res.aciertos).toBe(2);
    expect(await estadoDe(pablo.id, "m2-css")).toBeNull();
  });

  it("si acierta las 3 preguntas, marca el módulo como dominado y lo baja al final de la ruta sugerida", async () => {
    const pablo = await sesionDe("pablo@demo.test");
    const res = await responderDiagnosticoModulo(
      pablo,
      "m2-css",
      { respuestas: { "diag-css-1": 2, "diag-css-2": 1, "diag-css-3": 2 } },
      bd.db,
    );

    expect(res.dominado).toBe(true);
    expect(res.aciertos).toBe(3);
    expect(res.orden.at(-1)).toBe("m2-css");
    expect(res.principal).toBe("m1-html");
    expect(await estadoDe(pablo.id, "m2-css")).toBe("dominado");

    const [mat] = await bd.db
      .select({ orden: matricula.ordenModulos })
      .from(matricula)
      .innerJoin(curso, eq(curso.id, matricula.cursoId))
      .where(and(eq(matricula.usuarioId, pablo.id), eq(curso.slug, "desarrollo-web")));
    expect(mat.orden).toHaveLength(4);
  });

  it("sin el curso responde 403", async () => {
    const lucia = await sesionDe("lucia@demo.test");
    // Curso al que Lucía no está matriculada, o módulo inexistente -> 404
    expect((await errorDe(obtenerDiagnosticoModulo(lucia, "modulo-inexistente", bd.db))).codigo).toBe("NO_ENCONTRADO");
  });
});