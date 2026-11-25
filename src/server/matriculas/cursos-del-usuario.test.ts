import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { registrar } from "../auth/servicio";
import { confirmarPago, crearCheckout } from "../pagos/servicio";
import { cargarCursosDelUsuario, tieneElCurso } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("cursos del usuario con su progreso (con BBDD real)", () => {
  let bd: BdPrueba;
  const idDe = async (email: string) => (await bd.db.select().from(usuario).where(eq(usuario.email, email)))[0].id;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("lista los cursos de Lucía por título, con el porcentaje de módulos completados", async () => {
    const resultado = await cargarCursosDelUsuario(await idDe("lucia@demo.test"), () => bd.db);
    expect(resultado.estado).toBe("ok");
    if (resultado.estado !== "ok") return;

    const titulos = resultado.cursos.map((c) => c.titulo);
    expect(titulos).toEqual([...titulos].sort((a, b) => a.localeCompare(b, "es")));

    const web = resultado.cursos.find((c) => c.slug === "desarrollo-web");
    // Del progreso de demostración: HTML dominado y CSS en curso, de 4 módulos.
    expect(web).toMatchObject({ totalModulos: 4, modulosCompletados: 1, porcentaje: 25, rolEnCurso: "alumno", personalizada: false });
    expect(web!.categoria).toBe("Programación");
  });

  it("un curso sin progreso está al 0 %", async () => {
    const resultado = await cargarCursosDelUsuario(await idDe("pablo@demo.test"), () => bd.db);
    if (resultado.estado !== "ok") throw new Error(resultado.estado);
    expect(resultado.cursos.every((c) => c.porcentaje === 0)).toBe(true);
  });

  it("un usuario nuevo no tiene cursos; tras comprar uno, aparece al 0 %", async () => {
    const { usuario: nuevo } = await registrar({ nombre: "Nueva", email: "nueva@demo.test", contrasena: "segura123" }, bd.db);
    expect(await cargarCursosDelUsuario(nuevo.id, () => bd.db)).toEqual({ estado: "vacio" });

    const sesion = await crearCheckout(nuevo, { curso: "python-desde-cero" }, bd.db);
    await confirmarPago(nuevo, { sesion: sesion.id, metodo: "paypal" }, bd.db);

    const resultado = await cargarCursosDelUsuario(nuevo.id, () => bd.db);
    expect(resultado).toEqual({
      estado: "ok",
      cursos: [expect.objectContaining({ slug: "python-desde-cero", porcentaje: 0, modulosCompletados: 0 })],
    });
  });

  it("sin BBDD devuelve error en vez de lanzar", async () => {
    const resultado = await cargarCursosDelUsuario("x", () => {
      throw new Error("sin DATABASE_URL");
    });
    expect(resultado).toEqual({ estado: "error" });
  });

  it("tieneElCurso dice si el usuario está matriculado en un curso por su slug", async () => {
    const lucia = await idDe("lucia@demo.test");
    expect(await tieneElCurso(lucia, "desarrollo-web", () => bd.db)).toBe(true);
    expect(await tieneElCurso(lucia, "costura-para-principiantes", () => bd.db)).toBe(false);
    expect(await tieneElCurso(lucia, "no-existe", () => bd.db)).toBe(false);
  });

  it("tieneElCurso sin BBDD responde false en vez de lanzar", async () => {
    expect(
      await tieneElCurso("x", "desarrollo-web", () => {
        throw new Error("sin DATABASE_URL");
      }),
    ).toBe(false);
  });
});
