/**
 * Lectura de transcripciones VTT (data/transcripciones/) y construcción del temario
 * que recibe el tutor. Cada fragmento lleva su marca [vídeo @segundo] para que el tutor
 * pueda citar el momento exacto del vídeo.
 *
 * También convierte las transcripciones al markdown con marcas [mm:ss] que se guarda en la
 * tabla `documento` de la BBDD (#13), y lo lee de vuelta.
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

// ─── Markdown para la tabla `documento` (docs/bbdd/README.md) ────────────────
//
// Formato, una línea por fragmento:
//   ## Vídeo v04: Especificidad y cascada
//   [00:01] en este vídeo vamos a ver...
//   [01:34] la especificidad cuando dos reglas...
// Siempre [minutos:segundos]; si un vídeo pasara de una hora, los minutos siguen contando ([75:10]).

const MARCA_MD = /^\[(\d+):(\d{2})\]\s*(.*)$/;

/** "[mm:ss]" de un segundo: 94 → "[01:34]". */
export function marcaMinuto(segundo: number): string {
  const s = Math.max(0, Math.floor(segundo));
  return `[${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}]`;
}

/** Escribe los fragmentos de un vídeo en markdown, con un título y una marca [mm:ss] por fragmento. */
export function fragmentosAMarkdown(video: { id: string; titulo: string }, fragmentos: Fragmento[]): string {
  const lineas = [`## Vídeo ${video.id}: ${video.titulo}`, ""];
  for (const f of fragmentos) lineas.push(`${marcaMinuto(f.inicio)} ${f.texto.replace(/\s+/g, " ").trim()}`);
  return lineas.join("\n") + "\n";
}

/** Convierte un VTT (data/transcripciones/) al markdown que se guarda en `documento.contenido_md`. */
export function vttAMarkdown(video: { id: string; titulo: string }, contenidoVtt: string): string {
  return fragmentosAMarkdown(video, parsearVtt(contenidoVtt));
}

/**
 * Lee el markdown de una transcripción y devuelve sus fragmentos: lo contrario de `fragmentosAMarkdown`.
 * Ignora títulos y líneas vacías. Si una persona parte una línea al editarla, el texto que va
 * sin marca se une al fragmento anterior.
 */
export function parsearMarkdown(contenido: string): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  for (const linea of contenido.replace(/\r/g, "").split("\n").map((l) => l.trim())) {
    if (!linea || linea.startsWith("#")) continue;
    const marca = MARCA_MD.exec(linea);
    if (marca) {
      const [, m, s, texto] = marca;
      fragmentos.push({ inicio: Number(m) * 60 + Number(s), texto: texto.trim() });
    } else if (fragmentos.length) {
      const anterior = fragmentos[fragmentos.length - 1];
      anterior.texto = anterior.texto ? `${anterior.texto} ${linea}` : linea;
    }
  }
  return fragmentos.filter((f) => f.texto);
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
