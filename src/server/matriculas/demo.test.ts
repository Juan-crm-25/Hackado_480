import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { buscarConcepto, buscarModulo, buscarUsuarioDemo } from "./demo";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("puente de la demo hasta el login (con BBDD real)", () => {
  let bd: BdPrueba;
  beforeAll(async () => {
    bd = await crearBdPrueba();
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("sin seed no encuentra ni al alumno ni el módulo", async () => {
    expect(await buscarUsuarioDemo("a1", bd.db)).toBeNull();
    expect(await buscarModulo("m2-css", bd.db)).toBeNull();
  });

  it("resuelve el alumno de la demo por su email, y el módulo y el concepto por su slug", async () => {
    await sembrar(bd.db);

    const lucia = await buscarUsuarioDemo("a1", bd.db);
    expect(lucia).toMatchObject({ nombre: "Lucía Martín", email: "lucia@demo.test" });
    expect(lucia?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await buscarUsuarioDemo("a99", bd.db)).toBeNull();

    const css = await buscarModulo("m2-css", bd.db);
    expect(css).toMatchObject({ slug: "m2-css" });
    expect(await buscarModulo("m9-nada", bd.db)).toBeNull();

    expect(await buscarConcepto(css!.id, "css-especificidad", bd.db)).toMatchObject({ slug: "css-especificidad" });
    expect(await buscarConcepto(css!.id, "html-web", bd.db)).toBeNull();
  });
});
