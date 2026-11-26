import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, count, eq, inArray, like } from "drizzle-orm";
import { ALUMNOS_SIMULADOS } from "../../demo/actividad";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "../test-utils";
import { clase, concepto, conversacion, curso, ejercicio, intento, matricula, mensaje, modulo, progreso, usuario } from "../schema";
import { sembrarActividad } from "./actividad";
import { sembrar } from "./sembrar";

const hayBd = await bdPruebasDisponible();
const AHORA = new Date("2026-11-29T10:00:00Z");

describe.skipIf(!hayBd)("sembrarActividad (con BBDD real)", () => {
  let bd: BdPrueba;
  let lucia: string;
  let cssId: string;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    [{ id: lucia }] = await bd.db.select({ id: usuario.id }).from(usuario).where(eq(usuario.email, "lucia@demo.test"));

    // Banco de ejercicios: 2 aprobados por concepto del curso de la demo (menos js-dom), y de js-dom 1 borrador
    // y 1 aprobado de examen (las respuestas del examen no van a «intento»).
    const conceptos = await bd.db
      .select({ id: concepto.id, slug: concepto.slug, moduloId: concepto.moduloId })
      .from(concepto)
      .innerJoin(modulo, eq(modulo.id, concepto.moduloId))
      .innerJoin(curso, eq(curso.id, modulo.cursoId))
      .where(eq(curso.slug, "desarrollo-web"));
    const clases = await bd.db.select({ id: clase.id, moduloId: clase.moduloId }).from(clase);
    cssId = conceptos.find((c) => c.slug === "css-especificidad")!.moduloId;
    const filas = conceptos
      .filter((c) => c.slug !== "js-dom")
      .flatMap((c) =>
        [0, 1].map((n) => ({
          moduloId: c.moduloId,
          conceptoId: c.id,
          claseId: clases.find((x) => x.moduloId === c.moduloId)!.id,
          tipo: "test" as const,
          enunciado: `¿Pregunta ${n} de ${c.slug}?`,
          opciones: ["a", "b", "c"],
          solucion: 1,
          estado: "aprobado" as const,
        })),
      );
    const dom = conceptos.find((c) => c.slug === "js-dom")!;
    filas.push({ ...filas[0], moduloId: dom.moduloId, conceptoId: dom.id, claseId: clases.find((x) => x.moduloId === dom.moduloId)!.id, estado: "borrador" as never });
    const deExamen = { ...filas[filas.length - 1], enunciado: "¿Pregunta de examen de js-dom?", estado: "aprobado" as const, uso: "examen" as const };
    await bd.db.insert(ejercicio).values(deExamen);
    await bd.db.insert(ejercicio).values(filas);

    // Lucía (demo en directo) ya tiene una conversación propia: no se puede tocar.
    const [c] = await bd.db.insert(conversacion).values({ usuarioId: lucia, moduloId: cssId }).returning();
    await bd.db.insert(mensaje).values({ conversacionId: c.id, rol: "alumno", texto: "Pregunta de Lucía en directo" });
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  const contar = async () => {
    const simulados = bd.db.select({ id: usuario.id }).from(usuario).where(like(usuario.email, "%@simulado.demo.test"));
    return {
      simulados: (await bd.db.select({ n: count() }).from(usuario).where(like(usuario.email, "%@simulado.demo.test")))[0].n,
      matriculados: (
        await bd.db
          .select({ n: count() })
          .from(matricula)
          .innerJoin(curso, eq(curso.id, matricula.cursoId))
          .where(and(eq(curso.slug, "desarrollo-web"), like(matricula.email, "%@simulado.demo.test")))
      )[0].n,
      intentos: (await bd.db.select({ n: count() }).from(intento))[0].n,
      mensajes: (await bd.db.select({ n: count() }).from(mensaje))[0].n,
      progresosSimulados: (await bd.db.select({ n: count() }).from(progreso).where(inArray(progreso.usuarioId, simulados)))[0].n,
    };
  };

  it("crea los 20 alumnos simulados, matriculados, con intentos, dudas y progreso", async () => {
    const recuento = await sembrarActividad(bd.db, AHORA);
    const total = await contar();

    expect(total.simulados).toBe(ALUMNOS_SIMULADOS.length);
    expect(total.matriculados).toBe(ALUMNOS_SIMULADOS.length);
    expect(total.intentos).toBeGreaterThan(100);
    expect(total.mensajes).toBeGreaterThan(40);
    expect(total.progresosSimulados).toBeGreaterThan(0);
    expect(recuento.alumnos).toBe(28); // 20 simulados + 8 inventados del seed; nunca Lucía ni Pablo
    expect(recuento.intentos).toBe(total.intentos);
  });

  it("avisa de los conceptos sin ejercicios aprobados (los borradores y los de examen no cuentan)", async () => {
    const recuento = await sembrarActividad(bd.db, AHORA);
    expect(recuento.conceptosSinEjercicios).toEqual(["js-dom"]);
  });

  it("se puede repetir: ejecutarlo otra vez deja los mismos datos", async () => {
    await sembrarActividad(bd.db, AHORA);
    const antes = await contar();
    await sembrarActividad(bd.db, AHORA);
    expect(await contar()).toEqual(antes);
  });

  it("no toca a los alumnos de la demo en directo", async () => {
    await sembrarActividad(bd.db, AHORA);
    const deLucia = await bd.db
      .select({ texto: mensaje.texto })
      .from(mensaje)
      .innerJoin(conversacion, eq(conversacion.id, mensaje.conversacionId))
      .where(eq(conversacion.usuarioId, lucia));
    expect(deLucia).toEqual([{ texto: "Pregunta de Lucía en directo" }]);
    expect((await bd.db.select({ n: count() }).from(intento).where(eq(intento.usuarioId, lucia)))[0].n).toBe(0);
  });
});
