import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { comentarioForo, curso, modulo, puntoForo, temaForo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { obtenerPuntosDelAlumno } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("puntos del foro del alumno (con BBDD real)", () => {
  let bd: BdPrueba;
  const idDe = async (email: string) => (await bd.db.select().from(usuario).where(eq(usuario.email, email)))[0].id;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("suma los puntos de sus respuestas valoradas (+10 correcta, +5 aproximada) y los que le da el profesor", async () => {
    const [carmen, javier, profesora] = await Promise.all(["carmen@demo.test", "javier@demo.test", "profesora@demo.test"].map(idDe));
    const [m] = await bd.db.select({ id: modulo.id }).from(modulo).innerJoin(curso, eq(curso.id, modulo.cursoId)).where(eq(modulo.slug, "m2-css"));
    const [tema] = await bd.db.insert(temaForo).values({ moduloId: m.id, autorId: carmen, titulo: "Duda", cuerpo: "x" }).returning();
    const validado = (validacion: "correcta" | "aproximada" | "incorrecta" | "no_respuesta") => ({
      temaId: tema.id,
      autorId: javier,
      cuerpo: validacion,
      validacion,
      validadoPor: "ia" as const,
      validadoEn: new Date(),
    });
    const comentarios = await bd.db
      .insert(comentarioForo)
      .values([validado("correcta"), validado("correcta"), validado("aproximada"), validado("incorrecta"), validado("no_respuesta"), { temaId: tema.id, autorId: javier, cuerpo: "pendiente" }])
      .returning();
    await bd.db.insert(puntoForo).values([
      { profesorId: profesora, alumnoId: javier, comentarioId: comentarios[3].id, puntos: 3, motivo: "buena_conducta" },
      { profesorId: profesora, alumnoId: carmen, temaId: tema.id, puntos: 6, motivo: "buena_pregunta" },
    ]);

    expect(await obtenerPuntosDelAlumno(javier, bd.db)).toEqual({ total: 28, respuestas: 25, profesor: 3 });
    expect(await obtenerPuntosDelAlumno(carmen, bd.db)).toEqual({ total: 6, respuestas: 0, profesor: 6 });
    expect(await obtenerPuntosDelAlumno(profesora, bd.db)).toEqual({ total: 0, respuestas: 0, profesor: 0 });
  });
});
