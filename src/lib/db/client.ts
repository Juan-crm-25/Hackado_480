import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function crearDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL. Configúrala en .env.local (ver docs/bbdd/README.md, apartado 5).");
  }
  // prepare: false porque la conexión pooled de Neon (PgBouncer) no admite sentencias preparadas.
  const cliente = postgres(url, { prepare: false });
  return drizzle({ client: cliente, schema });
}

type Db = ReturnType<typeof crearDb>;

// Una sola instancia: en desarrollo, la recarga en caliente reevalúa el módulo y abriría conexiones nuevas.
const global = globalThis as unknown as { db?: Db };

export const db = global.db ?? crearDb();

if (process.env.NODE_ENV !== "production") global.db = db;
