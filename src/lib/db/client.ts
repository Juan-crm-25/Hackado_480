import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Opciones de conexión de postgres.js.
 * - prepare: false → la conexión pooled de Neon (PgBouncer) no admite sentencias preparadas.
 * - max: 1 → cada función de Vercel vive poco; más conexiones por instancia agotarían el pool de Neon.
 * - tiempos (segundos) → falla rápido si la BBDD no responde y libera las conexiones inactivas.
 */
export const OPCIONES_CONEXION = {
  prepare: false,
  max: 1,
  connect_timeout: 10,
  idle_timeout: 20,
} satisfies postgres.Options<Record<string, never>>;

function crearDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL. Configúrala en .env.local (ver docs/bbdd/README.md, apartado 5).");
  }
  return drizzle({ client: postgres(url, OPCIONES_CONEXION), schema });
}

export type Db = ReturnType<typeof crearDb>;

// Una sola instancia por proceso. Va en globalThis porque, en desarrollo, la recarga en caliente
// reevalúa este módulo y abriría conexiones nuevas con cada cambio.
const global = globalThis as unknown as { db?: Db };

/**
 * Cliente de la BBDD. Se crea en el primer uso, no al importar, para que `next build` y los tests
 * puedan importar módulos que dependen de él sin DATABASE_URL.
 */
export function getDb(): Db {
  global.db ??= crearDb();
  return global.db;
}
