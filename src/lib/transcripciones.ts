/**
 * Lectura de transcripciones VTT (data/transcripciones/) y construcción del temario
 * que recibe el tutor. Cada fragmento lleva su marca [vídeo @segundo] para que el tutor
 * pueda citar el momento exacto del vídeo.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Modulo } from "./types";

export interface Fragmento {
  /** Segundo en el que empieza el fragmento. */
  inicio: number;
  texto: string;
}

const CARPETA = path.join(process.cwd(), "data", "transcripciones");
const TIEMPO = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})\s+-->/;

/** Convierte el contenido de un VTT en fragmentos con su segundo de inicio. Ignora cabecera y notas. */
export function parsearVtt(contenido: string): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  for (const bloque of contenido.replace(/\r/g, "").split(/\n{2,}/)) {
    const lineas = bloque.split("\n").map((l) => l.trim());
    const i = lineas.findIndex((l) => TIEMPO.test(l));
    if (i === -1) continue;
    const [, h, m, s] = TIEMPO.exec(lineas[i])!;
    const texto = lineas
      .slice(i + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "") // etiquetas de estilo de los subtítulos
      .trim();
    if (texto) fragmentos.push({ inicio: Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s), texto });
  }
  return fragmentos;
}

/**
 * Une fragmentos seguidos en bloques de unos `segundos` de duración.
 * Los subtítulos de YouTube vienen en trozos de 2–5 s; agruparlos ahorra muchos tokens de marcas.
 */
export function agruparFragmentos(fragmentos: Fragmento[], segundos = 30): Fragmento[] {
  const bloques: Fragmento[] = [];
  for (const f of fragmentos) {
    const ultimo = bloques.at(-1);
    if (ultimo && f.inicio - ultimo.inicio < segundos) ultimo.texto += ` ${f.texto}`;
    else bloques.push({ ...f });
  }
  return bloques;
}

const cache = new Map<string, Fragmento[]>();

export function leerTranscripcion(fichero: string): Fragmento[] {
  if (!cache.has(fichero)) {
    cache.set(fichero, agruparFragmentos(parsearVtt(readFileSync(path.join(CARPETA, fichero), "utf8"))));
  }
  return cache.get(fichero)!;
}

/** Temario del módulo en texto, con una marca [vídeo @segundo] por fragmento. */
export function temarioDelModulo(modulo: Modulo, leer: (fichero: string) => Fragmento[] = leerTranscripcion): string {
  const partes: string[] = [];
  for (const video of modulo.videos) {
    if (!video.transcripcion) continue;
    partes.push(`### Vídeo ${video.id}: ${video.titulo}`);
    for (const f of leer(video.transcripcion)) partes.push(`[${video.id} @${f.inicio}] ${f.texto}`);
  }
  return partes.join("\n");
}
