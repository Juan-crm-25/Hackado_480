/**
 * Siembra la actividad simulada de la demo para el Radar del tutor (#5). Ver docs/bbdd/README.md, apartado 5.
 *
 *   npm run db:seed:actividad                              → BBDD local (DATABASE_URL de .env.local)
 *   SEED_PERMITIR_REMOTO=1 npm run db:seed:actividad       → otra BBDD (p. ej., Neon), solo a propósito
 *
 * Va DESPUÉS de `npm run db:seed` y de aprobar el banco de ejercicios: los intentos son sobre ejercicios aprobados.
 * Se puede repetir: borra la actividad simulada anterior y la vuelve a crear (las fechas, relativas a hoy).
 */
import { getDb } from "../src/lib/db/client";
import { sembrarActividad } from "../src/lib/db/seed/actividad";
import { comprobarDestino } from "../src/lib/db/seed/datos";

async function main() {
  const destino = comprobarDestino(process.env.DATABASE_URL, process.env.SEED_PERMITIR_REMOTO === "1");
  if (!destino.permitido) {
    console.error(`✗ No se siembra la actividad. ${destino.motivo}`);
    process.exit(1);
  }

  const db = getDb();
  try {
    const recuento = await sembrarActividad(db);
    console.log(
      `✓ Actividad simulada: ${recuento.alumnos} alumnos, ${recuento.intentos} intentos, ${recuento.mensajes} mensajes al tutor y ${recuento.progresos} progresos.`,
    );
    if (recuento.intentos === 0) {
      console.warn("⚠ No hay ningún ejercicio aprobado: el Radar no tendrá fallos. Genera y aprueba el banco (ver docs/bbdd/README.md).");
    } else if (recuento.conceptosSinEjercicios.length > 0) {
      console.warn(`⚠ Conceptos sin ejercicios aprobados (sin intentos simulados): ${recuento.conceptosSinEjercicios.join(", ")}`);
    }
  } finally {
    await db.$client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(`✗ La actividad simulada ha fallado: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
