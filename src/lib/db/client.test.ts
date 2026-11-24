import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El cliente no debe tocar la BBDD (ni DATABASE_URL) hasta el primer uso real,
// para que `next build` y los tests puedan importar módulos que dependen de él.
describe("cliente de la BBDD", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { db?: unknown }).db;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("se puede importar aunque falte DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(import("./client")).resolves.toHaveProperty("getDb");
  });

  it("getDb() falla con un mensaje claro si falta DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("./client");
    expect(() => getDb()).toThrow(/Falta DATABASE_URL/);
  });

  it("getDb() devuelve siempre la misma instancia", async () => {
    // postgres.js no conecta hasta la primera consulta: esta URL nunca se usa.
    vi.stubEnv("DATABASE_URL", "postgres://usuario:clave@localhost:1/ninguna");
    const { getDb } = await import("./client");
    expect(getDb()).toBe(getDb());
  });

  it("limita las conexiones para funciones serverless y el pool de Neon", async () => {
    const { OPCIONES_CONEXION } = await import("./client");
    expect(OPCIONES_CONEXION).toMatchObject({ prepare: false, max: 1 });
    expect(OPCIONES_CONEXION.connect_timeout).toBeGreaterThan(0);
    expect(OPCIONES_CONEXION.idle_timeout).toBeGreaterThan(0);
  });
});
