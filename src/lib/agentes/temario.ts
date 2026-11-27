/**
 * Temario de un módulo para la IA (#39): las transcripciones de sus vídeos, de la tabla `documento`, con una marca
 * [vídeo @segundo] por bloque para que los agentes citen el vídeo y el minuto. Lo usan el tutor, el material común, la
 * infografía, el material personal y el generador de ejercicios.
 */
import type { Db } from "../db/client";
import { parsearMarkdown } from "../transcripciones";
import type { Modulo } from "../types";
import { leerTranscripcionesDelModulo } from "@/server/catalogo/repositorio";

/**
 * El temario a partir de las transcripciones (markdown de `documento`) por id de vídeo: una cabecera por vídeo, en el
 * orden del módulo, y sus bloques. Los vídeos sin transcripción no salen; sin ninguna, el temario es "".
 */
export function temarioDeTranscripciones(modulo: Modulo, transcripciones: ReadonlyMap<string, string>): string {
  const partes: string[] = [];
  for (const video of modulo.videos) {
    const fragmentos = parsearMarkdown(transcripciones.get(video.id) ?? "");
    if (fragmentos.length === 0) continue;
    partes.push(`### Vídeo ${video.id}: ${video.titulo}`);
    for (const f of fragmentos) partes.push(`[${video.id} @${f.inicio}] ${f.texto}`);
  }
  return partes.join("\n");
}

/** Temario del módulo leyendo sus transcripciones de la BBDD. */
export async function temarioDelModulo(modulo: Modulo, db?: Db): Promise<string> {
  return temarioDeTranscripciones(modulo, await leerTranscripcionesDelModulo(modulo.id, db));
}
