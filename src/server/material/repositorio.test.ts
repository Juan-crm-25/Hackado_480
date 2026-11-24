import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, count, eq } from "drizzle-orm";
import { concepto, materialPersonal, modulo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { MaterialPersonal } from "@/lib/types";
import { guardarMaterialPersonal, listarMaterialPersonal, MAXIMO_POR_ALUMNO } from "./repositorio";

const hayBd = await bdPruebasDisponible();

const tarjetas = [{ pregunta: "¿P?", respuesta: "R", fuente: { videoId: "v04", segundo: 125 } }];
const resumen = [{ titulo: "Especificidad", texto: "Un id gana a una clase", fuente: { videoId: "v04", segundo: 125 } }];

describe.skipIf(!hayBd)("repositorio del material personal (con BBDD real)", () => {
  let bd: BdPrueba;
  let lucia: string;
  let pablo: string;
  let css: string;
  let html: string;
  let especificidad: string;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    const idUsuario = async (email: string) => (await bd.db.select().from(usuario).where(eq(usuario.email, email)))[0].id;
    const idModulo = async (slug: string) => (await bd.db.select().from(modulo).where(eq(modulo.slug, slug)))[0].id;
    lucia = await idUsuario("lucia@demo.test");
    pablo = await idUsuario("pablo@demo.test");
    css = await idModulo("m2-css");
    html = await idModulo("m1-html");
    [{ id: especificidad }] = await bd.db
      .select()
      .from(concepto)
      .where(and(eq(concepto.moduloId, css), eq(concepto.slug, "css-especificidad")));
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(materialPersonal);
  });

  const material = (extra: Partial<MaterialPersonal>): MaterialPersonal => ({
    id: randomUUID(),
    alumnoId: "a1",
    moduloId: "m2-css",
    tipo: "tarjetas",
    nivel: "normal",
    generado: "2026-11-24T10:00:00.000Z",
    tarjetas,
    ...extra,
  });

  it("guarda y lista por alumno, del más reciente al más antiguo, con los ids del contrato", async () => {
    const viejo = material({ conceptoId: "css-especificidad", nivel: "basico", enfoque: "con ejemplos" });
    const nuevo = material({ tipo: "resumen", tarjetas: undefined, resumen, generado: "2026-11-24T11:00:00.000Z" });
    await guardarMaterialPersonal(viejo, { usuarioId: lucia, moduloId: css, conceptoId: especificidad }, bd.db);
    await guardarMaterialPersonal(nuevo, { usuarioId: lucia, moduloId: css, conceptoId: null }, bd.db);
    await guardarMaterialPersonal(material({ alumnoId: "a2", moduloId: "m1-html" }), { usuarioId: pablo, moduloId: html, conceptoId: null }, bd.db);

    const lista = await listarMaterialPersonal({ usuarioId: lucia, alumnoId: "a1" }, bd.db);
    expect(lista).toEqual([
      { id: nuevo.id, alumnoId: "a1", moduloId: "m2-css", tipo: "resumen", nivel: "normal", generado: "2026-11-24T11:00:00.000Z", resumen },
      {
        id: viejo.id,
        alumnoId: "a1",
        moduloId: "m2-css",
        conceptoId: "css-especificidad",
        tipo: "tarjetas",
        nivel: "basico",
        enfoque: "con ejemplos",
        generado: "2026-11-24T10:00:00.000Z",
        tarjetas,
      },
    ]);
  });

  it("filtra por módulo", async () => {
    await guardarMaterialPersonal(material({}), { usuarioId: lucia, moduloId: css, conceptoId: null }, bd.db);
    expect(await listarMaterialPersonal({ usuarioId: lucia, alumnoId: "a1", moduloId: html }, bd.db)).toEqual([]);
    expect(await listarMaterialPersonal({ usuarioId: lucia, alumnoId: "a1", moduloId: css }, bd.db)).toHaveLength(1);
    expect(await listarMaterialPersonal({ usuarioId: pablo, alumnoId: "a2" }, bd.db)).toEqual([]);
  });

  it(`conserva solo los ${MAXIMO_POR_ALUMNO} más recientes de cada alumno`, async () => {
    const hora = (i: number) => new Date(Date.UTC(2026, 10, 24, 0, i)).toISOString();
    const guardados: string[] = [];
    for (let i = 0; i < MAXIMO_POR_ALUMNO + 2; i++) {
      const m = material({ generado: hora(i) });
      guardados.push(m.id);
      await guardarMaterialPersonal(m, { usuarioId: lucia, moduloId: css, conceptoId: null }, bd.db);
    }
    await guardarMaterialPersonal(material({ alumnoId: "a2" }), { usuarioId: pablo, moduloId: css, conceptoId: null }, bd.db);

    const lista = await listarMaterialPersonal({ usuarioId: lucia, alumnoId: "a1" }, bd.db);
    expect(lista.map((m) => m.id)).toEqual(guardados.slice(2).reverse());
    const [{ total }] = await bd.db.select({ total: count() }).from(materialPersonal).where(eq(materialPersonal.usuarioId, lucia));
    expect(total).toBe(MAXIMO_POR_ALUMNO);
    expect(await listarMaterialPersonal({ usuarioId: pablo, alumnoId: "a2" }, bd.db)).toHaveLength(1);
  });
});
