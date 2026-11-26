import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { clase, concepto, curso, ejercicio, modulo, usuario } from "@/lib/db/schema";
import { sembrarActividad } from "@/lib/db/seed/actividad";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "@/server/auth/roles";
import { ErrorApp } from "@/server/compartido/errores";
import { obtenerRadar } from "./servicio";

const hayBd = await bdPruebasDisponible();
const AHORA = new Date("2026-11-29T10:00:00Z");

describe.skipIf(!hayBd)("obtenerRadar (con BBDD real)", () => {
  let bd: BdPrueba;
  const sesion = async (email: string): Promise<UsuarioSesion> => {
    const [u] = await bd.db
      .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
      .from(usuario)
      .where(eq(usuario.email, email));
    return u;
  };

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    // Banco aprobado: 3 ejercicios tipo test por concepto del curso de la demo.
    const conceptos = await bd.db
      .select({ id: concepto.id, moduloId: concepto.moduloId })
      .from(concepto)
      .innerJoin(modulo, eq(modulo.id, concepto.moduloId))
      .innerJoin(curso, eq(curso.id, modulo.cursoId))
      .where(eq(curso.slug, "desarrollo-web"));
    const clases = await bd.db.select({ id: clase.id, moduloId: clase.moduloId }).from(clase);
    await bd.db.insert(ejercicio).values(
      conceptos.flatMap((c) =>
        [0, 1, 2].map((n) => ({
          moduloId: c.moduloId,
          conceptoId: c.id,
          claseId: clases.find((x) => x.moduloId === c.moduloId)!.id,
          tipo: "test" as const,
          enunciado: `¿Pregunta ${n}?`,
          opciones: ["a", "b", "c"],
          solucion: 1,
          estado: "aprobado" as const,
        })),
      ),
    );
    await sembrarActividad(bd.db, AHORA);
    // Una profesora de OTRO curso: no puede ver este Radar.
    await bd.db.insert(usuario).values({ nombre: "Otra Profe", email: "otra.profe@demo.test", rol: "profesor", emailVerificado: true, seudonimo: "profesor_otra" });
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("la profesora del curso ve el Radar con la actividad de sus alumnos", async () => {
    const informe = await obtenerRadar(await sesion("profesora@demo.test"), "desarrollo-web", bd.db, AHORA);

    expect(informe.curso).toEqual({ slug: "desarrollo-web", titulo: expect.any(String) });
    expect(informe.alumnos).toBe(30); // 10 del seed + 20 simulados; la profesora no cuenta
    expect(informe.conceptosMasFallados[0]).toMatchObject({ conceptoId: "css-especificidad", moduloId: "m2-css" });
    expect(informe.alertas.filter((a) => a.motivo === "fallos_repetidos").length).toBeGreaterThanOrEqual(3);
    expect(informe.alertas.filter((a) => a.motivo === "inactividad").length).toBeGreaterThanOrEqual(3);
    expect(informe.dudasFrecuentes.find((d) => d.moduloId === "m2-css")?.total).toBeGreaterThan(0);
    // A la profesora le llegan los nombres reales; nunca los de la demo en directo, que no tienen actividad.
    expect(informe.alertas.every((a) => a.nombre && a.nombre !== "Lucía Martín")).toBe(true);
  });

  it("el admin también lo ve, sin estar matriculado", async () => {
    const informe = await obtenerRadar(await sesion("admin@demo.test"), "desarrollo-web", bd.db, AHORA);
    expect(informe.alumnos).toBe(30);
  });

  it("un alumno del curso no puede verlo (403)", async () => {
    await expect(obtenerRadar(await sesion("lucia@demo.test"), "desarrollo-web", bd.db, AHORA)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
  });

  it("una profesora que no da ESTE curso no puede verlo (403)", async () => {
    const error = await obtenerRadar(await sesion("otra.profe@demo.test"), "desarrollo-web", bd.db, AHORA).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApp);
    expect(error.codigo).toBe("PROHIBIDO");
  });

  it("un curso que no existe responde 404", async () => {
    await expect(obtenerRadar(await sesion("admin@demo.test"), "no-existe", bd.db, AHORA)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });
});
