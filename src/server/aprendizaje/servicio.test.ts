import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import type { corregir as corregirReal } from "@/lib/agentes/corrector";
import { clase, concepto, ejercicio, intento, intentoEvaluacion, modulo, progreso, usoIa, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "@/server/auth/roles";
import { empezarTestModulo, entregarTestModulo } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("test del módulo con la sesión del usuario (con BBDD real)", () => {
  let bd: BdPrueba;
  let cssId: string;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];
  /** Corrector simulado: acierta si la respuesta es "bien" o el índice 1. */
  const corregir = () =>
    vi.fn<typeof corregirReal>(
      async (p, r) =>
        r === "bien" || r === 1
          ? { puntuacion: 1, correcto: true, feedback: "¡Correcto!", revisionHumana: false }
          : { puntuacion: 0, correcto: false, feedback: "No", repasar: p.referencia, revisionHumana: false },
    );
  const azar = () => 0.42;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    await bd.db.insert(usuario).values({ nombre: "Sin Curso", email: "sincurso.test@demo.test", emailVerificado: true, seudonimo: "alumno_sincurso_test" });
    [{ id: cssId }] = await bd.db.select({ id: modulo.id }).from(modulo).where(eq(modulo.slug, "m2-css"));
    const conceptos = await bd.db.select().from(concepto).where(eq(concepto.moduloId, cssId));
    const [v05] = await bd.db.select().from(clase).where(and(eq(clase.moduloId, cssId), eq(clase.slug, "v05")));
    // Banco de 7: 6 de test y 1 abierta. Con 7 (≤ 8) salen todas, también la abierta.
    await bd.db.insert(ejercicio).values(
      Array.from({ length: 7 }, (_, n) => ({
        moduloId: cssId,
        conceptoId: conceptos[n % conceptos.length].id,
        claseId: v05.id,
        segundoReferencia: 60 + n,
        tipo: n === 6 ? ("abierta" as const) : ("test" as const),
        enunciado: `Pregunta ${n}`,
        opciones: n === 6 ? null : ["a", "b"],
        solucion: n === 6 ? null : 1,
        rubrica: n === 6 ? "Rúbrica secreta" : null,
        estado: "aprobado" as const,
      })),
    );
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(intentoEvaluacion);
    await bd.db.delete(intento);
    await bd.db.delete(progreso);
    await bd.db.delete(usoIa);
  });

  it("empezar: da entre 5 y 8 preguntas del banco SIN solución ni rúbrica, la firma y la nota para aprobar", async () => {
    const test = await empezarTestModulo(await sesion("carmen@demo.test"), "m2-css", bd.db, { azar });
    expect(test.preguntas).toHaveLength(7);
    expect(test.notaAprobado).toBe(7);
    expect(test.firma).toMatch(/\S{20,}/);
    for (const p of test.preguntas) {
      expect(p).not.toHaveProperty("solucion");
      expect(p).not.toHaveProperty("rubrica");
      expect(p).toMatchObject({ moduloId: "m2-css", referencia: { videoId: "v05" } });
    }
    expect(JSON.stringify(test)).not.toContain("Rúbrica secreta");
  });

  it("empezar: sin el curso 403, módulo que no existe 404 y módulo sin banco 404", async () => {
    await expect(empezarTestModulo(await sesion("sincurso.test@demo.test"), "m2-css", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    await expect(empezarTestModulo(await sesion("carmen@demo.test"), "m9-nada", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(empezarTestModulo(await sesion("carmen@demo.test"), "m1-html", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });

  it("empezar: si no le quedan consultas para las preguntas con IA, no se abre (429) y no gasta nada", async () => {
    const carmen = await sesion("carmen@demo.test");
    await bd.db.insert(usoIa).values({ usuarioId: carmen.id, dia: sql`(now() at time zone 'utc')::date`, total: 30 });
    await expect(empezarTestModulo(carmen, "m2-css", bd.db, { azar })).rejects.toMatchObject({ codigo: "LIMITE_SUPERADO" });
    const [uso] = await bd.db.select().from(usoIa);
    expect(uso.total).toBe(30);
  });

  it("entregar: corrige, guarda, descuenta 1 consulta por pregunta con IA y devuelve nota y minuto que repasar", async () => {
    const carmen = await sesion("carmen@demo.test");
    const test = await empezarTestModulo(carmen, "m2-css", bd.db, { azar });
    const deps = { corregir: corregir() };
    // Acierta todas menos la primera de test: 6 de 7 → 8,57.
    const primeraTest = test.preguntas.find((p) => p.tipo === "test")!;
    const respuestas = test.preguntas.map((p) => ({
      ejercicioId: p.id,
      respuesta: p.id === primeraTest.id ? 0 : p.tipo === "test" ? 1 : "bien",
    }));

    const r = await entregarTestModulo(carmen, "m2-css", { firma: test.firma, respuestas }, bd.db, deps);

    expect(r).toMatchObject({ nota: 8.57, aprobado: true, notaAprobado: 7, mejorNota: 8.57, estado: "completado" });
    expect(r.resultados).toHaveLength(7);
    const fallo = r.resultados.find((x) => x.ejercicioId === primeraTest.id)!;
    expect(fallo).toMatchObject({ correcto: false, repasar: { videoId: "v05" } });
    // El nombre del alumno se le pasa al corrector para que lo quite de la respuesta.
    expect(deps.corregir.mock.calls[0][2]).toEqual({ nombresOcultos: ["Carmen López"] });
    expect(await bd.db.select().from(intento)).toHaveLength(7);
    const [uso] = await bd.db.select().from(usoIa);
    expect(uso.total).toBe(1);
  });

  it("entregar: sin la firma del test que se le dio, o con otras preguntas, 400 y no guarda nada", async () => {
    const carmen = await sesion("carmen@demo.test");
    const test = await empezarTestModulo(carmen, "m2-css", bd.db, { azar });
    const respuestas = test.preguntas.map((p) => ({ ejercicioId: p.id, respuesta: 1 }));
    const deps = { corregir: corregir() };

    await expect(entregarTestModulo(carmen, "m2-css", { firma: "falsa", respuestas }, bd.db, deps)).rejects.toMatchObject({
      codigo: "DATOS_INVALIDOS",
    });
    await expect(
      entregarTestModulo(carmen, "m2-css", { firma: test.firma, respuestas: respuestas.slice(1) }, bd.db, deps),
    ).rejects.toMatchObject({ codigo: "DATOS_INVALIDOS" });
    // La firma es de Carmen: a otro alumno no le vale.
    await expect(
      entregarTestModulo(await sesion("javier@demo.test"), "m2-css", { firma: test.firma, respuestas }, bd.db, deps),
    ).rejects.toMatchObject({ codigo: "DATOS_INVALIDOS" });
    expect(deps.corregir).not.toHaveBeenCalled();
    expect(await bd.db.select().from(intentoEvaluacion)).toEqual([]);
  });

  it("entregar: sin el curso, 403", async () => {
    await expect(
      entregarTestModulo(await sesion("sincurso.test@demo.test"), "m2-css", { firma: "x", respuestas: [] }, bd.db),
    ).rejects.toMatchObject({ codigo: "PROHIBIDO" });
  });
});
