/**
 * Genera el banco de ejercicios de verificación de los módulos (issue #4) y lo guarda como borrador en la BBDD.
 *
 *   npm run generar:ejercicios                  → todos los módulos que aún no tienen ejercicios
 *   npm run generar:ejercicios -- m2-css        → solo ese módulo
 *   npm run generar:ejercicios -- --forzar      → regenera: borra los borradores (nunca los aprobados)
 *
 * Lee la plantilla del profesor de la tabla plantilla_ejercicio (npm run db:seed). Solo escribe en la BBDD local,
 * salvo GENERAR_PERMITIR_REMOTO=1. Después, revisa los ejercicios y pasa a "aprobado" los buenos (npm run db:studio).
 */
import { generarEjercicios } from "../src/lib/agentes/ejercicios";
import { getModulos } from "../src/lib/catalogo";
import { getDb } from "../src/lib/db/client";
import { comprobarDestino } from "../src/lib/db/seed/datos";
import { contarEjercicios, guardarBorradores, leerPlantillaDelModulo } from "../src/server/aprendizaje/repositorio";

async function main() {
  const destino = comprobarDestino(process.env.DATABASE_URL, process.env.GENERAR_PERMITIR_REMOTO === "1", "GENERAR_PERMITIR_REMOTO");
  if (!destino.permitido) {
    console.error(`✗ No se generan ejercicios. ${destino.motivo}`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const forzar = args.includes("--forzar");
  const pedidos = args.filter((a) => !a.startsWith("--"));
  const modulos = getModulos().filter((m) => pedidos.length === 0 || pedidos.includes(m.id));
  if (pedidos.length && modulos.length !== pedidos.length) {
    console.error(`✗ Módulos desconocidos. Disponibles: ${getModulos().map((m) => m.id).join(", ")}`);
    process.exit(1);
  }

  const db = getDb();
  let errores = 0;
  try {
    for (const modulo of modulos) {
      try {
        const deLaBd = await leerPlantillaDelModulo(modulo.id, undefined, db);
        if (!deLaBd) throw new Error("no tiene plantilla de ejercicios en la BBDD (ejecuta npm run db:seed).");

        const hay = await contarEjercicios(deLaBd.moduloId, db);
        if (hay.borrador + hay.aprobado > 0 && !forzar) {
          console.log(`– ${modulo.id}: ya tiene ${hay.borrador} en borrador y ${hay.aprobado} aprobados (usa --forzar para regenerar los borradores)`);
          continue;
        }

        const inicio = Date.now();
        const ejercicios = await generarEjercicios(modulo, deLaBd.plantilla);
        const guardados = await guardarBorradores(deLaBd.moduloId, ejercicios, { reemplazar: forzar }, db);
        const cuenta = new Map<string, number>();
        for (const e of ejercicios) cuenta.set(e.tipo, (cuenta.get(e.tipo) ?? 0) + 1);
        const porTipo = [...cuenta].map(([tipo, n]) => `${n} ${tipo}`).join(", ");
        console.log(`✓ ${modulo.id}: ${guardados} ejercicios en borrador (${porTipo}) en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
      } catch (e) {
        errores++;
        console.error(`✗ ${modulo.id}: ${(e as Error).message}`);
      }
    }
  } finally {
    await db.$client.end({ timeout: 5 });
  }

  if (errores) process.exit(1);
  console.log('\nRevisa los ejercicios (npm run db:studio → tabla "ejercicio") y cambia "estado" a "aprobado" en los buenos.');
}

main();
