/**
 * Siembra la BBDD con los datos mínimos para desarrollar y para la demo (ver docs/bbdd/README.md, apartado 5).
 *
 *   npm run db:seed                              → BBDD local (DATABASE_URL de .env.local)
 *   SEED_PERMITIR_REMOTO=1 npm run db:seed       → otra BBDD (p. ej., Neon), solo a propósito
 *
 * Es idempotente: ejecutarlo varias veces deja los mismos datos.
 */
import { getDb } from "../src/lib/db/client";
import { comprobarDestino } from "../src/lib/db/seed/datos";
import { sembrar } from "../src/lib/db/seed/sembrar";

async function main() {
  const destino = comprobarDestino(process.env.DATABASE_URL, process.env.SEED_PERMITIR_REMOTO === "1");
  if (!destino.permitido) {
    console.error(`✗ No se siembra la BBDD. ${destino.motivo}`);
    process.exit(1);
  }

  const db = getDb();
  try {
    const recuento = await sembrar(db);
    console.log("✓ Seed aplicado. Filas por tabla:");
    console.table(recuento);
  } finally {
    await db.$client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(`✗ El seed ha fallado: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
