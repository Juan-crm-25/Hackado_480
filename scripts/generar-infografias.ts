/**
 * Genera una infografía por concepto de los módulos con transcripciones (#7).
 *
 *   npm run generar:infografias                 → módulos que aún no tienen infografías
 *   npm run generar:infografias -- m2-css       → solo ese módulo
 *   npm run generar:infografias -- --forzar     → regenera aunque ya existan (se pierde la revisión)
 *
 * Se guardan con "revisado": false. Revísalas y cambia el valor a true en el fichero.
 */
import { existsSync } from "node:fs";
import { generarInfografia } from "../src/lib/agentes/infografia";
import { getConfigIA } from "../src/lib/ai/config";
import { getModulos } from "../src/lib/catalogo";
import { guardarInfografias, rutaInfografias } from "../src/lib/infografias";
import type { Infografia } from "../src/lib/types";

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes("--forzar");
  const pedidos = args.filter((a) => !a.startsWith("--"));
  const modulos = getModulos().filter((m) => pedidos.length === 0 || pedidos.includes(m.id));
  if (pedidos.length && modulos.length !== pedidos.length) {
    console.error(`Módulos desconocidos. Disponibles: ${getModulos().map((m) => m.id).join(", ")}`);
    process.exit(1);
  }

  let errores = 0;
  for (const modulo of modulos) {
    if (!modulo.videos.some((v) => v.transcripcion)) {
      console.log(`– ${modulo.id}: sin transcripciones, se salta`);
      continue;
    }
    if (existsSync(rutaInfografias(modulo.id)) && !forzar) {
      console.log(`– ${modulo.id}: ya tiene infografías (usa --forzar para regenerarlas)`);
      continue;
    }

    const infografias: Infografia[] = [];
    // Una por vídeo, sobre su concepto (provisional hasta que el paso 3 del #15 lo guarde en la BBDD).
    for (const video of modulo.videos.filter((v) => v.transcripcion)) {
      // Hasta 2 intentos por vídeo: a veces el modelo no respeta el formato a la primera.
      for (let intento = 1; intento <= 2; intento++) {
        try {
          const info = await generarInfografia(modulo, video);
          infografias.push(info);
          console.log(`✓ ${modulo.id} · ${video.id}: plantilla «${info.plantilla}»`);
          break;
        } catch (e) {
          console.error(`${intento === 2 ? "✗" : "↻"} ${modulo.id} · ${video.id}: ${(e as Error).message}`);
          if (intento === 2) errores++;
        }
      }
    }

    if (infografias.length) {
      const ruta = guardarInfografias({
        moduloId: modulo.id,
        generado: new Date().toISOString(),
        modelo: getConfigIA().modelos.generador,
        revisado: false,
        infografias,
      });
      console.log(`  → ${ruta}`);
    }
  }

  if (errores) process.exit(1);
  console.log('\nRevisa las infografías y cambia "revisado" a true en cada fichero cuando estén correctas.');
}

main();
