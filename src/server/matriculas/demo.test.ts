import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { buscarConcepto, buscarModulo } from "./demo";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("módulos y conceptos de la demo en la BBDD (con BBDD real)", () => {
  let bd: BdPrueba;
  beforeAll(async () => {
    bd = await crearBdPrueba();
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("sin seed no encuentra el módulo", async () => {
    expect(await buscarModulo("m2-css", bd.db)).toBeNull();
  });

  it("resuelve el módulo y el concepto por su slug", async () => {
    await sembrar(bd.db);

    const css = await buscarModulo("m2-css", bd.db);
    expect(css).toMatchObject({ slug: "m2-css" });
    expect(await buscarModulo("m9-nada", bd.db)).toBeNull();

    expect(await buscarConcepto(css!.id, "css-especificidad", bd.db)).toMatchObject({ slug: "css-especificidad" });
    expect(await buscarConcepto(css!.id, "html-web", bd.db)).toBeNull();
  });
});
