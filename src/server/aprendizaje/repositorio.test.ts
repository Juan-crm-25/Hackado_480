import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import m2Css from "../../../data/ejemplos-profesor/m2-css.json";
import type { EjercicioGenerado } from "@/lib/agentes/ejercicios";
import { clase, concepto, ejercicio, modulo } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { contarEjercicios, guardarBorradores, leerPlantillaDelModulo } from "./repositorio";

const hayBd = await bdPruebasDisponible();

const generado = (n: number, conceptoId = "css-especificidad", videoId = "v04"): EjercicioGenerado => ({
  moduloId: "m2-css",
  conceptoId,
  tipo: "test",
  enunciado: `¿Qué regla gana en el caso ${n}?`,
  opciones: ["La de la clase", "La del id"],
  solucion: 1,
  referencia: { videoId, segundo: 120 + n },
});
const abierto: EjercicioGenerado = {
  moduloId: "m2-css",
  conceptoId: "css-caja",
  tipo: "abierta",
  enunciado: "Explica padding y margin.",
  rubrica: "Padding dentro, margin fuera.",
  referencia: { videoId: "v05", segundo: 60 },
};

describe.skipIf(!hayBd)("repositorio de aprendizaje (con BBDD real)", () => {
  let bd: BdPrueba;
  let cssId: string;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    const [css] = await bd.db.select().from(modulo).where(eq(modulo.slug, "m2-css"));
    cssId = css.id;
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("lee la plantilla del profesor de un módulo del curso de la demo, con el id del módulo en la BBDD", async () => {
    expect(await leerPlantillaDelModulo("m2-css", undefined, bd.db)).toEqual({
      moduloId: cssId,
      plantilla: { moduloId: "m2-css", tipos: m2Css.tipos, ejemplos: m2Css.ejemplos, indicaciones: m2Css.indicaciones },
    });
  });

  it("devuelve null si el módulo no existe o no tiene plantilla", async () => {
    expect(await leerPlantillaDelModulo("m9-inventado", undefined, bd.db)).toBeNull();
    expect(await leerPlantillaDelModulo("p1-primeros-pasos", "python-desde-cero", bd.db)).toBeNull();
  });

  it("guarda los ejercicios como borrador, con el concepto y el vídeo del módulo y el segundo de referencia", async () => {
    expect(await contarEjercicios(cssId, bd.db)).toEqual({ borrador: 0, aprobado: 0 });
    expect(await guardarBorradores(cssId, [generado(1), abierto], undefined, bd.db)).toBe(2);

    const filas = await bd.db
      .select({ e: ejercicio, concepto: concepto.slug, clase: clase.slug })
      .from(ejercicio)
      .innerJoin(concepto, eq(concepto.id, ejercicio.conceptoId))
      .innerJoin(clase, eq(clase.id, ejercicio.claseId))
      .where(eq(ejercicio.moduloId, cssId))
      .orderBy(ejercicio.enunciado);
    expect(filas.map((f) => [f.concepto, f.clase, f.e.segundoReferencia, f.e.estado])).toEqual([
      ["css-caja", "v05", 60, "borrador"],
      ["css-especificidad", "v04", 121, "borrador"],
    ]);
    expect(filas[0].e).toMatchObject({ tipo: "abierta", rubrica: "Padding dentro, margin fuera.", opciones: null, solucion: null });
    expect(filas[1].e).toMatchObject({ tipo: "test", opciones: ["La de la clase", "La del id"], solucion: 1, rubrica: null });
    expect(await contarEjercicios(cssId, bd.db)).toEqual({ borrador: 2, aprobado: 0 });
  });

  it("si un concepto o un vídeo no es del módulo, no guarda ninguno", async () => {
    const antes = await contarEjercicios(cssId, bd.db);
    await expect(guardarBorradores(cssId, [generado(2), generado(3, "js-eventos")], undefined, bd.db)).rejects.toThrow(/js-eventos/);
    await expect(guardarBorradores(cssId, [generado(4), generado(5, "css-caja", "v10")], undefined, bd.db)).rejects.toThrow(/v10/);
    expect(await contarEjercicios(cssId, bd.db)).toEqual(antes);
  });

  it("al reemplazar, borra los borradores del módulo pero nunca los aprobados", async () => {
    await bd.db
      .update(ejercicio)
      .set({ estado: "aprobado" })
      .where(and(eq(ejercicio.moduloId, cssId), eq(ejercicio.tipo, "abierta")));
    expect(await contarEjercicios(cssId, bd.db)).toEqual({ borrador: 1, aprobado: 1 });

    await guardarBorradores(cssId, [generado(6), generado(7)], { reemplazar: true }, bd.db);
    expect(await contarEjercicios(cssId, bd.db)).toEqual({ borrador: 2, aprobado: 1 });
    const enunciados = (await bd.db.select().from(ejercicio).where(eq(ejercicio.moduloId, cssId))).map((e) => e.enunciado).sort();
    expect(enunciados).toEqual(["Explica padding y margin.", "¿Qué regla gana en el caso 6?", "¿Qué regla gana en el caso 7?"]);
  });
});
