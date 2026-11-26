import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { clase, concepto, ejercicio, evaluacion, intento, intentoEvaluacion, modulo, progreso, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { guardarTestModulo, leerBancoAprobado, type PreguntaDelBanco } from "./repositorio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("test del módulo en la BBDD (con BBDD real)", () => {
  let bd: BdPrueba;
  let cssId: string;
  let carmen: string;
  let banco: PreguntaDelBanco[];

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    [{ id: cssId }] = await bd.db.select({ id: modulo.id }).from(modulo).where(eq(modulo.slug, "m2-css"));
    [{ id: carmen }] = await bd.db.select({ id: usuario.id }).from(usuario).where(eq(usuario.email, "carmen@demo.test"));
    const conceptos = await bd.db.select().from(concepto).where(eq(concepto.moduloId, cssId)).orderBy(concepto.slug);
    const [v04] = await bd.db.select().from(clase).where(and(eq(clase.moduloId, cssId), eq(clase.slug, "v04")));
    const fila = (n: number, extra: Partial<typeof ejercicio.$inferInsert> = {}) => ({
      moduloId: cssId,
      conceptoId: conceptos[n % conceptos.length].id,
      claseId: v04.id,
      segundoReferencia: 100 + n,
      tipo: "test" as const,
      enunciado: `Pregunta ${n}`,
      opciones: ["a", "b"],
      solucion: 1,
      estado: "aprobado" as const,
      ...extra,
    });
    await bd.db.insert(ejercicio).values([
      ...[0, 1, 2, 3, 4, 5].map((n) => fila(n)),
      fila(6, { tipo: "abierta", opciones: null, solucion: null, rubrica: "R" }),
      fila(7, { estado: "borrador" }),
      fila(8, { uso: "video" }),
      fila(9, { uso: "examen" }),
    ]);
    banco = await leerBancoAprobado(cssId, "modulo", bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(intentoEvaluacion);
    await bd.db.delete(intento);
    await bd.db.delete(progreso);
  });

  it("lee solo los aprobados del uso pedido, con el concepto y el vídeo por su slug", async () => {
    expect(banco.map((p) => p.enunciado).sort()).toEqual(["Pregunta 0", "Pregunta 1", "Pregunta 2", "Pregunta 3", "Pregunta 4", "Pregunta 5", "Pregunta 6"]);
    const p0 = banco.find((p) => p.enunciado === "Pregunta 0")!;
    expect(p0).toMatchObject({ tipo: "test", opciones: ["a", "b"], solucion: 1, referencia: { videoId: "v04", segundo: 100 } });
    expect(p0.conceptoId).toMatch(/^css-/);
    expect((await leerBancoAprobado(cssId, "video", bd.db)).map((p) => p.enunciado)).toEqual(["Pregunta 8"]);
  });

  /** Guarda un intento con estas puntuaciones sobre las primeras preguntas del banco. */
  const guardar = (puntuaciones: number[], nota: number, aprobado: boolean) =>
    guardarTestModulo(
      {
        usuarioId: carmen,
        moduloId: cssId,
        nota,
        aprobado,
        resultados: puntuaciones.map((p, i) => ({
          pregunta: banco[i],
          respuesta: 1,
          correccion: { puntuacion: p, correcto: p === 1, feedback: "F", revisionHumana: false, ...(p < 1 ? { repasar: banco[i].referencia } : {}) },
        })),
      },
      bd.db,
    );

  it("guarda cada respuesta en intento, el test entero en intento_evaluacion y el módulo en curso si suspende", async () => {
    const r = await guardar([1, 0, 1, 1, 0], 6, false);
    expect(r).toEqual({ mejorNota: 6, estado: "en_curso" });

    const intentos = await bd.db.select().from(intento).where(eq(intento.usuarioId, carmen));
    expect(intentos).toHaveLength(5);
    const fallo = intentos.find((i) => i.ejercicioId === banco[1].id)!;
    expect(fallo).toMatchObject({ correcto: false, puntuacion: 0, repasarSegundo: banco[1].referencia.segundo });
    expect(fallo.repasarClaseId).not.toBeNull();

    const [test] = await bd.db.select().from(evaluacion).where(eq(evaluacion.moduloId, cssId));
    expect(test).toMatchObject({ tipo: "test", notaAprobado: 7 });
    const [entero] = await bd.db.select().from(intentoEvaluacion).where(eq(intentoEvaluacion.usuarioId, carmen));
    expect(entero).toMatchObject({ evaluacionId: test.id, nota: 6, aprobado: false });
    expect(Object.keys(entero.respuestas)).toHaveLength(5);

    const [p] = await bd.db.select().from(progreso).where(eq(progreso.usuarioId, carmen));
    expect(p.estado).toBe("en_curso");
    expect(Object.values(p.aciertosPorConcepto).every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it("al aprobar, el módulo queda completado; un suspenso después no lo baja y cuenta el mejor intento", async () => {
    expect(await guardar([1, 1, 1, 1, 1], 10, true)).toEqual({ mejorNota: 10, estado: "completado" });
    const [antes] = await bd.db.select().from(progreso).where(eq(progreso.usuarioId, carmen));

    expect(await guardar([0, 0, 0, 0, 0], 0, false)).toEqual({ mejorNota: 10, estado: "completado" });
    const [despues] = await bd.db.select().from(progreso).where(eq(progreso.usuarioId, carmen));
    expect(despues.aciertosPorConcepto).toEqual(antes.aciertosPorConcepto); // los del mejor intento
    expect(await bd.db.select().from(intentoEvaluacion)).toHaveLength(2); // se guardan todos
    expect(await bd.db.select().from(evaluacion).where(eq(evaluacion.moduloId, cssId))).toHaveLength(1); // un test por módulo
  });

  it("un módulo «dominado» por el diagnóstico sigue dominado si suspende", async () => {
    await bd.db.insert(progreso).values({ usuarioId: carmen, moduloId: cssId, estado: "dominado" });
    expect((await guardar([0, 0, 0, 0, 0], 0, false)).estado).toBe("dominado");
  });
});
