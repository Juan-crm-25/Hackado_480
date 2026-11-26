import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { conversacion, mensaje, modulo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { ErrorAnalista } from "@/lib/agentes/analista";
import type { UsuarioSesion } from "@/server/auth/roles";
import { obtenerResumenDudas, vaciarCacheResumen } from "./servicio";

const hayBd = await bdPruebasDisponible();
const AHORA = new Date("2026-11-29T10:00:00Z");

describe.skipIf(!hayBd)("obtenerResumenDudas (con BBDD real)", () => {
  let bd: BdPrueba;
  let carmen: string;
  let css: string;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];
  const preguntar = async (texto: string, fecha = new Date(AHORA.getTime() - 3600_000)) => {
    const [c] = await bd.db.insert(conversacion).values({ usuarioId: carmen, moduloId: css }).returning();
    await bd.db.insert(mensaje).values({ conversacionId: c.id, rol: "alumno", texto, fecha });
  };

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    carmen = (await bd.db.select().from(usuario).where(eq(usuario.email, "carmen@demo.test")))[0].id;
    css = (await bd.db.select().from(modulo).where(eq(modulo.slug, "m2-css")))[0].id;
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    vaciarCacheResumen();
    await bd.db.delete(conversacion);
  });

  it("la profesora recibe el resumen; al analista solo le llegan textos agrupados por módulo, sin quién preguntó", async () => {
    await preguntar("¿Un id gana a una clase?");
    await preguntar("¿un id gana a una clase? ");
    await preguntar("Pregunta antigua", new Date("2026-11-01T10:00:00Z")); // más de 2 semanas: no cuenta
    const resumir = vi.fn().mockResolvedValue({ resumen: "Dudas sobre especificidad." });

    const r = await obtenerResumenDudas(await sesion("profesora@demo.test"), "desarrollo-web", bd.db, { resumir }, AHORA);

    expect(r).toEqual({ resumen: "Dudas sobre especificidad.", generado: AHORA.toISOString() });
    const entrada = resumir.mock.calls[0][0];
    expect(entrada.dudas).toEqual([{ modulo: "CSS", preguntas: [{ texto: "¿Un id gana a una clase?", veces: 2 }] }]);
    expect(JSON.stringify(entrada)).not.toMatch(/Carmen|carmen|@/);
  });

  it("usa la caché si no hay preguntas nuevas, y vuelve a llamar a la IA cuando las hay", async () => {
    await preguntar("¿Qué es rem?");
    const resumir = vi.fn().mockResolvedValue({ resumen: "Dudas sobre unidades." });
    const profesora = await sesion("profesora@demo.test");

    await obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir }, AHORA);
    await obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir }, new Date(AHORA.getTime() + 60_000));
    expect(resumir).toHaveBeenCalledTimes(1);

    await preguntar("¿Y em?", new Date(AHORA.getTime() + 90_000));
    await obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir }, new Date(AHORA.getTime() + 120_000));
    expect(resumir).toHaveBeenCalledTimes(2);
  });

  it("la caché caduca a la hora", async () => {
    await preguntar("¿Qué es rem?");
    const resumir = vi.fn().mockResolvedValue({ resumen: "Dudas sobre unidades." });
    const profesora = await sesion("profesora@demo.test");
    await obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir }, AHORA);
    await obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir }, new Date(AHORA.getTime() + 61 * 60_000));
    expect(resumir).toHaveBeenCalledTimes(2);
  });

  it("un alumno no puede pedirlo (403) y no se llama a la IA", async () => {
    const resumir = vi.fn();
    await expect(obtenerResumenDudas(await sesion("lucia@demo.test"), "desarrollo-web", bd.db, { resumir }, AHORA)).rejects.toMatchObject({
      codigo: "PROHIBIDO",
    });
    expect(resumir).not.toHaveBeenCalled();
  });

  it("si la IA falla, responde ERROR_IA (502) y no guarda nada en la caché", async () => {
    await preguntar("¿Qué es rem?");
    const profesora = await sesion("profesora@demo.test");
    const falla = vi.fn().mockRejectedValue(new ErrorAnalista("roto"));
    await expect(obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir: falla }, AHORA)).rejects.toMatchObject({ codigo: "ERROR_IA" });

    const bien = vi.fn().mockResolvedValue({ resumen: "Ahora sí." });
    expect((await obtenerResumenDudas(profesora, "desarrollo-web", bd.db, { resumir: bien }, AHORA)).resumen).toBe("Ahora sí.");
  });
});
