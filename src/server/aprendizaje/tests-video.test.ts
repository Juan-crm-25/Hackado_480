import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { clase, concepto, ejercicio, intento, modulo, progreso, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "@/server/auth/roles";
import { comprobarTestVideo, testsDeLosVideos } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("test de cada vídeo (con BBDD real)", () => {
  let bd: BdPrueba;
  let cssId: string;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];
  /** Ids de las 2 preguntas de un vídeo, en orden. */
  const deVideo = async (video: string) => (await testsDeLosVideos(await sesion("carmen@demo.test"), "m2-css", bd.db)).porVideo[video];

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    await bd.db.insert(usuario).values({ nombre: "Sin Curso", email: "sincurso.video@demo.test", emailVerificado: true, seudonimo: "alumno_sincurso_video" });
    [{ id: cssId }] = await bd.db.select({ id: modulo.id }).from(modulo).where(eq(modulo.slug, "m2-css"));
    const [c] = await bd.db.select().from(concepto).where(eq(concepto.moduloId, cssId)).limit(1);
    const clases = await bd.db.select().from(clase).where(eq(clase.moduloId, cssId)).orderBy(clase.slug);
    const v04 = clases.find((x) => x.slug === "v04")!;
    const v05 = clases.find((x) => x.slug === "v05")!;
    const fila = (n: number, claseId: string, extra: Partial<typeof ejercicio.$inferInsert> = {}) => ({
      moduloId: cssId,
      conceptoId: c.id,
      claseId,
      segundoReferencia: 30 + n,
      tipo: "test" as const,
      uso: "video" as const,
      enunciado: `Pregunta ${n}`,
      opciones: ["a", "b", "c"],
      solucion: 2,
      estado: "aprobado" as const,
      ...extra,
    });
    await bd.db.insert(ejercicio).values([
      fila(1, v04.id),
      fila(2, v04.id, { tipo: "respuesta_corta", opciones: null, solucion: "margin" }),
      fila(3, v05.id),
      fila(4, v05.id, { estado: "borrador" }),
      fila(5, v05.id, { uso: "modulo" }),
    ]);
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(intento);
    await bd.db.delete(progreso);
  });

  it("da las preguntas aprobadas de vídeo agrupadas por vídeo, SIN solución, y nada de los vídeos sin test", async () => {
    const r = await testsDeLosVideos(await sesion("carmen@demo.test"), "m2-css", bd.db);
    expect(r.moduloId).toBe("m2-css");
    expect(r.porVideo.v04.map((p) => p.enunciado)).toEqual(["Pregunta 1", "Pregunta 2"]);
    expect(r.porVideo.v05.map((p) => p.enunciado)).toEqual(["Pregunta 3"]);
    expect(r.porVideo.v06).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain("margin");
    expect(r.porVideo.v04[0]).toMatchObject({ tipo: "test", opciones: ["a", "b", "c"], referencia: { videoId: "v04", segundo: 31 } });
  });

  it("sin el curso 403; módulo que no existe 404", async () => {
    await expect(testsDeLosVideos(await sesion("sincurso.video@demo.test"), "m2-css", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    await expect(testsDeLosVideos(await sesion("carmen@demo.test"), "m9-nada", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });

  it("todo bien: superado; guarda cada respuesta en intento y el módulo pasa a «en curso»", async () => {
    const carmen = await sesion("carmen@demo.test");
    const [p1, p2] = await deVideo("v04");
    const r = await comprobarTestVideo(
      carmen,
      "m2-css",
      { videoId: "v04", respuestas: [{ ejercicioId: p1.id, respuesta: 2 }, { ejercicioId: p2.id, respuesta: " Margin " }] },
      bd.db,
    );
    expect(r.superado).toBe(true);
    expect(r.resultados.map((x) => x.correcto)).toEqual([true, true]);
    expect(await bd.db.select().from(intento).where(eq(intento.usuarioId, carmen.id))).toHaveLength(2);
    const [p] = await bd.db.select().from(progreso).where(and(eq(progreso.usuarioId, carmen.id), eq(progreso.moduloId, cssId)));
    expect(p.estado).toBe("en_curso");
  });

  it("un fallo: no superado, con el minuto del vídeo que repasar; un módulo completado no baja", async () => {
    const carmen = await sesion("carmen@demo.test");
    await bd.db.insert(progreso).values({ usuarioId: carmen.id, moduloId: cssId, estado: "completado" });
    const [p1, p2] = await deVideo("v04");
    const r = await comprobarTestVideo(
      carmen,
      "m2-css",
      { videoId: "v04", respuestas: [{ ejercicioId: p1.id, respuesta: 0 }, { ejercicioId: p2.id, respuesta: "margin" }] },
      bd.db,
    );
    expect(r.superado).toBe(false);
    expect(r.resultados[0]).toMatchObject({ correcto: false, repasar: { videoId: "v04", segundo: 31 } });
    const [p] = await bd.db.select().from(progreso).where(eq(progreso.usuarioId, carmen.id));
    expect(p.estado).toBe("completado");
  });

  it("hay que responder justo las preguntas de ESE vídeo: si no, 400 y no guarda nada", async () => {
    const carmen = await sesion("carmen@demo.test");
    const [p1, p2] = await deVideo("v04");
    const [p3] = await deVideo("v05");
    const mal = [
      { videoId: "v04", respuestas: [{ ejercicioId: p1.id, respuesta: 2 }] }, // falta una
      { videoId: "v05", respuestas: [{ ejercicioId: p1.id, respuesta: 2 }] }, // de otro vídeo
      { videoId: "v04", respuestas: [{ ejercicioId: p1.id, respuesta: 2 }, { ejercicioId: p1.id, respuesta: 2 }] }, // repetida
      { videoId: "v04", respuestas: [{ ejercicioId: p1.id, respuesta: 2 }, { ejercicioId: p3.id, respuesta: 2 }] },
    ];
    for (const peticion of mal) {
      await expect(comprobarTestVideo(carmen, "m2-css", peticion, bd.db)).rejects.toMatchObject({ codigo: "DATOS_INVALIDOS" });
    }
    expect(p2).toBeDefined();
    expect(await bd.db.select().from(intento)).toEqual([]);
  });
});
