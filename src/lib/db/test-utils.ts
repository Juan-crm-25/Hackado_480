/**
 * BBDD de usar y tirar para los tests de integración (AGENTS.md, «Testing rules»).
 * Cada fichero de test crea su propia BBDD en el Docker local (`npm run db:up`), le aplica las migraciones
 * de drizzle/ y la borra al acabar. Nunca toca la BBDD `hackado` del desarrollador ni la de producción.
 */
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { Db } from "./client";
import * as schema from "./schema";

/** Servidor del Docker local. Se conecta a la BBDD `postgres` (de mantenimiento) solo para crear y borrar. */
const SERVIDOR = "postgres://hackado:hackado@localhost:5433";
const CARPETA_MIGRACIONES = fileURLToPath(new URL("../../../drizzle", import.meta.url));

function admin() {
  return postgres(`${SERVIDOR}/postgres`, { max: 1, connect_timeout: 3, onnotice: () => {} });
}

/**
 * ¿Está el Docker local? Si no, avisa y devuelve false para saltar los tests (`describe.skipIf`).
 * Se llama una vez por fichero, arriba del todo: `const hayBd = await bdPruebasDisponible();`
 */
export async function bdPruebasDisponible(): Promise<boolean> {
  const sql = admin();
  try {
    await sql`select 1`;
    return true;
  } catch {
    console.warn(`[test] Se saltan los tests con BBDD: no hay PostgreSQL en ${SERVIDOR}. Arráncalo con «npm run db:up».`);
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export interface BdPrueba {
  db: Db;
  nombre: string;
  /** Cierra las conexiones y borra la BBDD. */
  borrar: () => Promise<void>;
}

/** Crea una BBDD con nombre único, le aplica las migraciones y devuelve su cliente (con varias conexiones). */
export async function crearBdPrueba(): Promise<BdPrueba> {
  const nombre = `hackado_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const sqlAdmin = admin();
  try {
    await sqlAdmin.unsafe(`CREATE DATABASE "${nombre}"`);
  } finally {
    await sqlAdmin.end({ timeout: 1 });
  }

  const cliente = postgres(`${SERVIDOR}/${nombre}`, { max: 10, onnotice: () => {} });
  const db = drizzle({ client: cliente, schema });
  await migrate(db, { migrationsFolder: CARPETA_MIGRACIONES });

  return {
    db,
    nombre,
    borrar: async () => {
      await cliente.end({ timeout: 1 });
      const sql = admin();
      try {
        await sql.unsafe(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      } finally {
        await sql.end({ timeout: 1 });
      }
    },
  };
}
