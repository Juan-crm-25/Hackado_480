/**
 * Genera el material común de cada vídeo (#15): resumen, tarjetas e infografía, y lo guarda SIN REVISAR en la BBDD
 * (tabla material_clase). Los alumnos no lo ven hasta que una persona lo revisa (npm run db:studio).
 *
 *   npm run generar:material                  → lo que les falte a todos los vídeos
 *   npm run generar:material -- m2-css        → solo los vídeos de ese módulo
 *   npm run generar:material -- --forzar      → regenera también lo que no está revisado (lo revisado nunca)
 *
 * Necesita el seed (npm run db:seed) para que existan las clases. Solo escribe en la BBDD local,
 * salvo GENERAR_PERMITIR_REMOTO=1. Cada vídeo se guarda en cuanto se genera: si algo falla, lo demás se conserva.
 * Si falla la infografía de un vídeo, su resumen y sus tarjetas se guardan igual.
 */
import { conceptoDelVideo, generarInfografia } from "../src/lib/agentes/infografia";
import { generarMaterialDeVideo } from "../src/lib/agentes/material";
import { getConfigIA } from "../src/lib/ai/config";
import { getModulos } from "../src/lib/catalogo";
import { getDb } from "../src/lib/db/client";
import { comprobarDestino } from "../src/lib/db/seed/datos";
import type { Infografia } from "../src/lib/types";
import { porGenerar } from "../src/server/material/pendientes";
import { guardarMaterialClase, materialGuardado, type MaterialDeClase } from "../src/server/material/repositorio";
import { buscarModulo } from "../src/server/matriculas/demo";

/** A veces el modelo no respeta el formato a la primera: se le da una segunda oportunidad. */
async function conReintento<T>(generar: () => Promise<T>, etiqueta: string): Promise<T> {
  try {
    return await generar();
  } catch (e) {
    console.error(`  ↻ ${etiqueta}: ${(e as Error).message} (se reintenta)`);
    return generar();
  }
}

async function main() {
  const destino = comprobarDestino(process.env.DATABASE_URL, process.env.GENERAR_PERMITIR_REMOTO === "1", "GENERAR_PERMITIR_REMOTO");
  if (!destino.permitido) {
    console.error(`✗ No se genera material. ${destino.motivo}`);
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
  const modelo = getConfigIA().modelos.generador;
  let errores = 0;
  let escritas = 0;
  try {
    for (const modulo of modulos) {
      const moduloBd = await buscarModulo(modulo.id, db);
      if (!moduloBd) {
        errores++;
        console.error(`✗ ${modulo.id}: no está en la BBDD (ejecuta npm run db:seed).`);
        continue;
      }
      const guardado = await materialGuardado(moduloBd.id, db);

      for (const video of modulo.videos) {
        const etiqueta = `${modulo.id} · ${video.id}`;
        if (!video.transcripcion) {
          console.log(`– ${etiqueta}: sin transcripción, se salta`);
          continue;
        }
        const falta = porGenerar(video.id, guardado, forzar);
        if (!falta.resumen && !falta.tarjetas && !falta.infografia) {
          console.log(`– ${etiqueta}: ya tiene su material (usa --forzar para regenerar lo no revisado)`);
          continue;
        }

        const inicio = Date.now();
        const nuevos: MaterialDeClase[] = [];
        const hecho: string[] = [];

        if (falta.resumen || falta.tarjetas) {
          try {
            const material = await conReintento(() => generarMaterialDeVideo(modulo, video), `${etiqueta} resumen y tarjetas`);
            if (falta.resumen) {
              nuevos.push({ videoId: video.id, tipo: "resumen", contenido: material.resumen, modelo: material.modelo });
              hecho.push(`${material.resumen.length} apartados`);
            }
            if (falta.tarjetas) {
              nuevos.push({ videoId: video.id, tipo: "tarjetas", contenido: material.tarjetas, modelo: material.modelo });
              hecho.push(`${material.tarjetas.length} tarjetas`);
            }
          } catch (e) {
            errores++;
            console.error(`✗ ${etiqueta} resumen y tarjetas: ${(e as Error).message}`);
          }
        }

        if (falta.infografia) {
          try {
            const info: Infografia = await conReintento(() => generarInfografia(modulo, video), `${etiqueta} infografía`);
            nuevos.push({ videoId: video.id, tipo: "infografia", contenido: [info], modelo });
            hecho.push(`infografía «${info.plantilla}» de «${conceptoDelVideo(modulo, video).nombre}»`);
          } catch (e) {
            errores++;
            console.error(`✗ ${etiqueta} infografía: ${(e as Error).message}`);
          }
        }

        if (nuevos.length) {
          escritas += await guardarMaterialClase(moduloBd.id, nuevos, { reemplazar: forzar }, db);
          console.log(`✓ ${etiqueta}: ${hecho.join(", ")} en ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
        }
      }
    }
  } finally {
    await db.$client.end({ timeout: 5 });
  }

  console.log(`\n${escritas} filas guardadas sin revisar en material_clase.`);
  if (errores) {
    console.error(`${errores} errores: vuelve a ejecutarlo para reintentar solo lo que falta.`);
    process.exit(1);
  }
  console.log('Revisa el material (npm run db:studio → tabla "material_clase") y cambia "revisado" a true en lo que esté bien.');
}

main();
