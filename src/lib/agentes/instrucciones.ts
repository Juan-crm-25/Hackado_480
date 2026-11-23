/**
 * Las instrucciones de cada agente viven en agents/<agente>.md (entregable del reto),
 * dentro de un bloque ```prompt. Se leen de ahí para que el documento y el código no se separen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

export function extraerPrompt(markdown: string): string {
  const bloque = /```prompt\r?\n([\s\S]*?)\r?\n```/.exec(markdown);
  if (!bloque) throw new Error("No se encontró el bloque ```prompt en las instrucciones del agente");
  return bloque[1].trim();
}

export function leerInstrucciones(agente: string): string {
  if (!cache.has(agente)) {
    const md = readFileSync(path.join(process.cwd(), "agents", `${agente}.md`), "utf8");
    cache.set(agente, extraerPrompt(md));
  }
  return cache.get(agente)!;
}

/** Sustituye las variables {{nombre}} del prompt. Falla si queda alguna sin valor. */
export function rellenar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => {
    if (!(clave in valores)) throw new Error(`Falta el valor de {{${clave}}} en las instrucciones`);
    return valores[clave];
  });
}
