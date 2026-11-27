import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { comentarioForo, curso, modulo, movimientoPuntos, temaForo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { ErrorApp } from "../compartido/errores";
import { canjearPremio, obtenerSaldoPremios, sumarPuntosDemo } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("saldo de puntos y canje de premios (con BBDD real)", () => {
  let bd: BdPrueba;
  let n = 0;

  /** Alumno nuevo, sin puntos ni movimientos. */
  async function alumnoNuevo() {
    const [u] = await bd.db
      .insert(usuario)
      .values({ nombre: `Alumno ${++n}`, email: `premios${n}@test.test`, emailVerificado: true, rol: "alumno", seudonimo: `premios-${n}` })
      .returning();
    return u.id;
  }

  /** Le da `correctas` respuestas correctas en temas distintos (+10 cada una). */
  async function darPuntosForo(alumnoId: string, correctas: number) {
    const [m] = await bd.db.select({ id: modulo.id }).from(modulo).innerJoin(curso, eq(curso.id, modulo.cursoId)).where(eq(modulo.slug, "m2-css"));
    const otro = await alumnoNuevo();
    for (let i = 0; i < correctas; i++) {
      const [tema] = await bd.db.insert(temaForo).values({ moduloId: m.id, autorId: otro, titulo: `Duda ${alumnoId}-${i}`, cuerpo: "x" }).returning();
      await bd.db.insert(comentarioForo).values({
        temaId: tema.id,
        autorId: alumnoId,
        cuerpo: "respuesta",
        validacion: "correcta",
        validadoPor: "ia",
        validadoEn: new Date(),
      });
    }
  }

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("el saldo son los puntos del foro: sin movimientos, nada canjeado", async () => {
    const alumno = await alumnoNuevo();
    await darPuntosForo(alumno, 3);
    expect(await obtenerSaldoPremios(alumno, bd.db)).toEqual({
      foro: 30,
      respuestas: 30,
      profesor: 0,
      demo: 0,
      canjeado: 0,
      saldo: 30,
      canjeados: [],
    });
  });

  it("los puntos de demo (100 o 1000) se guardan en la BBDD y suman al saldo", async () => {
    const alumno = await alumnoNuevo();
    await sumarPuntosDemo(alumno, 100, bd.db);
    const saldo = await sumarPuntosDemo(alumno, 1000, bd.db);
    expect(saldo).toMatchObject({ demo: 1100, saldo: 1100 });
  });

  it("canjear un premio resta sus puntos del saldo y lo marca como canjeado", async () => {
    const alumno = await alumnoNuevo();
    await darPuntosForo(alumno, 5); // 50
    for (let i = 0; i < 4; i++) await sumarPuntosDemo(alumno, 100, bd.db); // +400 = 450

    const saldo = await canjearPremio(alumno, "preguntas-tutor", bd.db);
    expect(saldo).toEqual({
      foro: 50,
      respuestas: 50,
      profesor: 0,
      demo: 400,
      canjeado: 100,
      saldo: 350,
      canjeados: ["preguntas-tutor"],
    });

    const filas = await bd.db.select().from(movimientoPuntos).where(eq(movimientoPuntos.usuarioId, alumno));
    expect(filas.find((f) => f.tipo === "canje")).toMatchObject({ premio: "preguntas-tutor", puntos: -100 });
  });

  it("tras canjear, un premio que antes alcanzaba puede quedar sin saldo suficiente", async () => {
    const alumno = await alumnoNuevo();
    for (let i = 0; i < 4; i++) await sumarPuntosDemo(alumno, 100, bd.db); // 400
    await canjearPremio(alumno, "preguntas-tutor", bd.db); // 300
    await expect(canjearPremio(alumno, "pato-480", bd.db)).rejects.toMatchObject({ codigo: "CONFLICTO" });
    expect((await obtenerSaldoPremios(alumno, bd.db)).saldo).toBe(300);
  });

  it("un premio no se canjea dos veces", async () => {
    const alumno = await alumnoNuevo();
    for (let i = 0; i < 3; i++) await sumarPuntosDemo(alumno, 100, bd.db);
    await canjearPremio(alumno, "preguntas-tutor", bd.db);
    await expect(canjearPremio(alumno, "preguntas-tutor", bd.db)).rejects.toMatchObject({ codigo: "CONFLICTO" });
    expect((await obtenerSaldoPremios(alumno, bd.db)).saldo).toBe(200);
  });

  it("un premio que no existe es un 404 y no toca el saldo", async () => {
    const alumno = await alumnoNuevo();
    await sumarPuntosDemo(alumno, 100, bd.db);
    const error = await canjearPremio(alumno, "coche-deportivo", bd.db).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorApp);
    expect(error).toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect((await obtenerSaldoPremios(alumno, bd.db)).saldo).toBe(100);
  });

  it("dos canjes a la vez no pueden gastar el mismo saldo (doble clic, dos pestañas)", async () => {
    const alumno = await alumnoNuevo();
    for (let i = 0; i < 4; i++) await sumarPuntosDemo(alumno, 100, bd.db); // 400: llega para uno de los dos, no para ambos
    const resultados = await Promise.allSettled([canjearPremio(alumno, "pato-480", bd.db), canjearPremio(alumno, "preguntas-tutor", bd.db)]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(2 - resultados.filter((r) => r.status === "rejected").length);
    const saldo = await obtenerSaldoPremios(alumno, bd.db);
    expect(saldo.saldo).toBeGreaterThanOrEqual(0);
    expect(saldo.saldo).toBe(400 - saldo.canjeado);
    // 340 + 100 = 440 > 400: como mucho uno de los dos pudo canjearse.
    expect(saldo.canjeados).toHaveLength(1);
  });
});
