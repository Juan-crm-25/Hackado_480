import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { usoIa, usuario } from "../db/schema";
import { sembrar } from "../db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "../db/test-utils";
import { consumirConsulta } from "./limite";

const hayBd = await bdPruebasDisponible();
const LIMITE = 3;
const HOY_UTC = sql`(now() at time zone 'utc')::date`;

describe.skipIf(!hayBd)("límite diario (con BBDD real)", () => {
  let bd: BdPrueba;
  const ids: string[] = [];

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    const alumnos = await bd.db.select({ id: usuario.id }).from(usuario).where(eq(usuario.rol, "alumno"));
    ids.push(...alumnos.map((a) => a.id));
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    vi.stubEnv("AI_LIMITE_DIARIO", String(LIMITE));
    await bd.db.delete(usoIa);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const totalHoy = async (usuarioId: string) => {
    const [fila] = await bd.db
      .select({ total: usoIa.total })
      .from(usoIa)
      .where(and(eq(usoIa.usuarioId, usuarioId), eq(usoIa.dia, HOY_UTC)));
    return fila?.total ?? 0;
  };

  it("deja hacer consultas hasta el límite, con las restantes bajando", async () => {
    expect(await consumirConsulta(ids[0], bd.db)).toEqual({ permitido: true, restantes: 2 });
    expect(await consumirConsulta(ids[0], bd.db)).toEqual({ permitido: true, restantes: 1 });
    expect(await consumirConsulta(ids[0], bd.db)).toEqual({ permitido: true, restantes: 0 });
  });

  it("al pasar el límite rechaza la consulta y no la cuenta", async () => {
    for (let i = 0; i < LIMITE; i++) await consumirConsulta(ids[0], bd.db);
    expect(await consumirConsulta(ids[0], bd.db)).toEqual({ permitido: false, restantes: 0 });
    expect(await totalHoy(ids[0])).toBe(LIMITE);
  });

  it("cuenta por separado a cada alumno", async () => {
    for (let i = 0; i < LIMITE; i++) await consumirConsulta(ids[0], bd.db);
    expect(await consumirConsulta(ids[1], bd.db)).toEqual({ permitido: true, restantes: 2 });
  });

  it("empieza de cero cada día (UTC)", async () => {
    await bd.db.insert(usoIa).values({ usuarioId: ids[0], dia: sql`${HOY_UTC} - 1`, total: LIMITE });
    expect(await consumirConsulta(ids[0], bd.db)).toEqual({ permitido: true, restantes: 2 });
  });

  it("con muchas consultas a la vez deja pasar exactamente el límite", async () => {
    const resultados = await Promise.all(Array.from({ length: LIMITE + 5 }, () => consumirConsulta(ids[0], bd.db)));
    expect(resultados.filter((r) => r.permitido)).toHaveLength(LIMITE);
    expect(await totalHoy(ids[0])).toBe(LIMITE);
  });
});
