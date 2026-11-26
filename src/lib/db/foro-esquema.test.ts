import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { comentarioForo, modulo, puntoForo, temaForo, usuario } from "./schema";
import { sembrar } from "./seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "./test-utils";

const hayBd = await bdPruebasDisponible();

/** Comprueba que la BBDD rechaza la operación (una restricción de la migración). */
async function rechaza(promesa: Promise<unknown>) {
  await expect(promesa).rejects.toThrow();
}

describe.skipIf(!hayBd)("esquema del foro (H10, con BBDD real)", () => {
  let bd: BdPrueba;
  let alumnoId: string;
  let profesorId: string;
  let moduloId: string;
  let temaId: string;
  let comentarioId: string;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    const idDe = async (email: string) => (await bd.db.select().from(usuario).where(eq(usuario.email, email)))[0].id;
    alumnoId = await idDe("lucia@demo.test");
    profesorId = await idDe("profesora@demo.test");
    [{ id: moduloId }] = await bd.db.select({ id: modulo.id }).from(modulo).where(eq(modulo.slug, "m2-css"));
    [{ id: temaId }] = await bd.db
      .insert(temaForo)
      .values({ moduloId, autorId: alumnoId, titulo: "¿Qué gana, una clase o un id?", cuerpo: "No lo entiendo" })
      .returning({ id: temaForo.id });
    [{ id: comentarioId }] = await bd.db
      .insert(comentarioForo)
      .values({ temaId, autorId: profesorId, cuerpo: "El id tiene más especificidad" })
      .returning({ id: comentarioForo.id });
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("un tema cuelga del módulo; la clase es opcional", async () => {
    const [tema] = await bd.db.select().from(temaForo).where(eq(temaForo.id, temaId));
    expect(tema).toMatchObject({ moduloId, claseId: null });
  });

  it("un comentario puede quedar valorado como correcta, aproximada, incorrecta o no_respuesta", async () => {
    for (const validacion of ["correcta", "aproximada", "incorrecta", "no_respuesta"] as const) {
      await bd.db
        .update(comentarioForo)
        .set({ validacion, validadoPor: "ia", validadoEn: new Date() })
        .where(eq(comentarioForo.id, comentarioId));
    }
    const [c] = await bd.db.select().from(comentarioForo).where(eq(comentarioForo.id, comentarioId));
    expect(c.validacion).toBe("no_respuesta");
  });

  it("los puntos del profesor solo pueden ser 1, 3 o 6", async () => {
    await rechaza(
      bd.db.insert(puntoForo).values({ profesorId, alumnoId, temaId, puntos: 2, motivo: "buena_pregunta" }),
    );
    const [ok] = await bd.db
      .insert(puntoForo)
      .values({ profesorId, alumnoId, temaId, puntos: 6, motivo: "buena_pregunta" })
      .returning();
    expect(ok.puntos).toBe(6);
  });

  it("un premio va a un tema o a un comentario, nunca a los dos ni a ninguno", async () => {
    await rechaza(
      bd.db.insert(puntoForo).values({ profesorId, alumnoId, temaId, comentarioId, puntos: 1, motivo: "buena_conducta" }),
    );
    await rechaza(bd.db.insert(puntoForo).values({ profesorId, alumnoId, puntos: 1, motivo: "buena_conducta" }));
  });

  it("cada tema o comentario tiene como mucho un premio (se cambia, no se acumula)", async () => {
    await rechaza(
      bd.db.insert(puntoForo).values({ profesorId, alumnoId, temaId, puntos: 1, motivo: "buena_conducta" }),
    );
    await bd.db.insert(puntoForo).values({ profesorId, alumnoId, comentarioId, puntos: 3, motivo: "buena_conducta" });
    await rechaza(
      bd.db.insert(puntoForo).values({ profesorId, alumnoId, comentarioId, puntos: 1, motivo: "buena_conducta" }),
    );
  });
});
