/**
 * Genera el material común (resumen + tarjetas) de los módulos con transcripciones.
 *
 *   npm run generar:material                 → todos los módulos que aún no tienen material
 *   npm run generar:material -- m2-css       → solo ese módulo
 *   npm run generar:material -- --forzar     → regenera aunque ya exista (se pierde la revisión)
 *
 * El material se guarda con "revisado": false. Revísalo y cambia el valor a true en el fichero.
 */
import { existsSync } from "node:fs";
import { generarMaterialDeVideo } from "../src/lib/agentes/material";
import { getModulos } from "../src/lib/catalogo";
import { guardarMaterialComun, rutaMaterial } from "../src/lib/material";
import type { MaterialComun } from "../src/lib/types";

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
    if (existsSync(rutaMaterial(modulo.id)) && !forzar) {
      console.log(`– ${modulo.id}: ya tiene material (usa --forzar para regenerarlo)`);
      continue;
    }
    try {
      const inicio = Date.now();
      // Por vídeo, juntado en el fichero del módulo (provisional hasta que el paso 3 del #15 lo guarde en la BBDD).
      const material: MaterialComun = { moduloId: modulo.id, generado: new Date().toISOString(), modelo: "", revisado: false, resumen: [], tarjetas: [] };
      for (const video of modulo.videos.filter((v) => v.transcripcion)) {
        const deVideo = await generarMaterialDeVideo(modulo, video);
        material.modelo = deVideo.modelo;
        material.resumen.push(...deVideo.resumen);
        material.tarjetas.push(...deVideo.tarjetas);
      }
      const ruta = guardarMaterialComun(material);
      console.log(
        `✓ ${modulo.id}: ${material.resumen.length} apartados y ${material.tarjetas.length} tarjetas en ${((Date.now() - inicio) / 1000).toFixed(1)} s → ${ruta}`,
      );
    } catch (e) {
      errores++;
      console.error(`✗ ${modulo.id}: ${(e as Error).message}`);
    }
  }

  if (errores) process.exit(1);
  console.log('\nRevisa el material y cambia "revisado" a true en cada fichero cuando esté correcto.');
}

main();
