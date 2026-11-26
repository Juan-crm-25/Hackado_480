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
    let minuto = 0; // fechas explícitas: la regla sigue el orden de creación
    const validado = (validacion: "correcta" | "aproximada" | "incorrecta" | "no_respuesta") => ({
      temaId: tema.id,
      autorId: javier,
      cuerpo: validacion,
      validacion,
      validadoPor: "ia" as const,
      validadoEn: new Date(),
      creado: new Date(Date.UTC(2026, 10, 20, 10, minuto++)),
    });
    const comentarios = await bd.db
      .insert(comentarioForo)
      .values([validado("correcta"), validado("correcta"), validado("aproximada"), validado("incorrecta"), validado("no_respuesta"), { temaId: tema.id, autorId: javier, cuerpo: "pendiente" }])
      .returning();
    await bd.db.insert(puntoForo).values([
      { profesorId: profesora, alumnoId: javier, comentarioId: comentarios[3].id, puntos: 3, motivo: "buena_conducta" },
      { profesorId: profesora, alumnoId: carmen, temaId: tema.id, puntos: 6, motivo: "buena_pregunta" },
    ]);

    // Regla anti-spam (S12): en un tema solo cuenta su primera respuesta con puntos (la primera correcta, +10).
    expect(await obtenerPuntosDelAlumno(javier, bd.db)).toEqual({ total: 13, respuestas: 10, profesor: 3 });
    expect(await obtenerPuntosDelAlumno(carmen, bd.db)).toEqual({ total: 6, respuestas: 0, profesor: 6 });
    expect(await obtenerPuntosDelAlumno(profesora, bd.db)).toEqual({ total: 0, respuestas: 0, profesor: 0 });
  });

  it("suma por tema con la misma regla del hilo: una vez por tema y solo las 3 primeras correctas de personas distintas (S12)", async () => {
    const carmen = await idDe("carmen@demo.test");
    const [spam, ...otros] = await bd.db
      .insert(usuario)
      .values(["spam", "eva", "pau", "noa"].map((n) => ({ nombre: n, email: `${n}.r12@demo.test`, rol: "alumno" as const, emailVerificado: true, seudonimo: `alumno_${n}_r12` })))
      .returning();
    const [m] = await bd.db.select({ id: modulo.id }).from(modulo).where(eq(modulo.slug, "m2-css"));
    const [t1, t2, t3] = await bd.db
      .insert(temaForo)
      .values([1, 2, 3].map((n) => ({ moduloId: m.id, autorId: carmen, titulo: `Duda ${n}`, cuerpo: "x" })))
      .returning();
    const base = Date.UTC(2026, 10, 20, 10, 0);
    const fila = (temaId: string, autorId: string, minuto: number, validacion: "correcta" | "aproximada") => ({
      temaId,
      autorId,
      cuerpo: validacion,
      validacion,
      validadoPor: "ia" as const,
      creado: new Date(base + minuto * 60_000),
    });
    await bd.db.insert(comentarioForo).values([
      // Tema 1: hace spam con 5 correctas → +10 una sola vez.
      ...[1, 2, 3, 4, 5].map((min) => fila(t1.id, spam.id, min, "correcta")),
      // Tema 2: llega cuarto con una correcta → 0; su aproximada después → +5.
      ...otros.map((o, i) => fila(t2.id, o.id, i + 1, "correcta")),
      fila(t2.id, spam.id, 10, "correcta"),
      fila(t2.id, spam.id, 11, "aproximada"),
      // Tema 3: aproximada y luego correcta → +5.
      fila(t3.id, spam.id, 1, "aproximada"),
      fila(t3.id, spam.id, 2, "correcta"),
    ]);

    expect(await obtenerPuntosDelAlumno(spam.id, bd.db)).toEqual({ total: 20, respuestas: 20, profesor: 0 });
    expect(await obtenerPuntosDelAlumno(otros[0].id, bd.db)).toEqual({ total: 10, respuestas: 10, profesor: 0 });
  });
});
