/** Utilidades para validar lo que devuelven los modelos. Nunca se confía en ellos a ciegas. */
import type { Modulo, ReferenciaVideo } from "../types";

/** Quita el bloque ```json ... ``` que algunos modelos ponen alrededor del JSON. */
export function quitarBloqueCodigo(texto: string): string {
  return texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

/** JSON.parse del texto completo o, si falla, del primer {...} que contenga. Devuelve null si no hay JSON. */
export function parsearObjetoJson(texto: string): Record<string, unknown> | null {
  const limpio = quitarBloqueCodigo(texto);
  for (const candidato of [limpio, limpio.slice(limpio.indexOf("{"), limpio.lastIndexOf("}") + 1)]) {
    try {
      const datos = JSON.parse(candidato);
      if (datos && typeof datos === "object" && !Array.isArray(datos)) return datos as Record<string, unknown>;
    } catch {
      // siguiente intento
    }
  }
  return null;
}

/**
 * Se queda solo con las fuentes válidas: vídeos que existen en el módulo y segundos dentro
 * de la duración del vídeo. Quita duplicados y se queda con las `max` primeras.
 */
export function validarFuentes(lista: unknown, modulo: Modulo, max = 3): ReferenciaVideo[] {
  const fuentes: ReferenciaVideo[] = [];
  if (!Array.isArray(lista)) return fuentes;
  for (const f of lista as { videoId?: unknown; segundo?: unknown }[]) {
    const video = modulo.videos.find((v) => v.id === f?.videoId);
    const segundo = Number(f?.segundo);
    if (!video || !Number.isFinite(segundo)) continue;
    const tope = video.duracionSegundos > 0 ? video.duracionSegundos : Infinity;
    const ajustado = Math.round(Math.min(Math.max(segundo, 0), tope));
    if (!fuentes.some((x) => x.videoId === video.id && x.segundo === ajustado)) {
      fuentes.push({ videoId: video.id, segundo: ajustado });
    }
    if (fuentes.length === max) break;
  }
  return fuentes;
}
