/**
 * Las instrucciones de cada agente viven en agents/<agente>.md (entregable del reto),
 * dentro de un bloque ```prompt. Se leen de ahí para que el documento y el código no se separen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

/**
 * El bloque ```prompt del agente. Un agente con varios prompts los distingue por nombre (```prompt video);
 * sin nombre se devuelve el bloque que no lo tiene.
 */
export function extraerPrompt(markdown: string, nombre?: string): string {
  const cabecera = nombre ? `prompt ${nombre}` : "prompt";
  const bloque = new RegExp("```" + cabecera + "[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n```").exec(markdown);
  if (!bloque) throw new Error(`No se encontró el bloque \`\`\`${cabecera} en las instrucciones del agente`);
  return bloque[1].trim();
}

export function leerInstrucciones(agente: string, nombre?: string): string {
  const clave = nombre ? `${agente}#${nombre}` : agente;
  if (!cache.has(clave)) {
    const md = readFileSync(path.join(process.cwd(), "agents", `${agente}.md`), "utf8");
    cache.set(clave, extraerPrompt(md, nombre));
  }
  return cache.get(clave)!;
}

/** Sustituye las variables {{nombre}} del prompt. Falla si queda alguna sin valor. */
export function rellenar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => {
    if (!(clave in valores)) throw new Error(`Falta el valor de {{${clave}}} en las instrucciones`);
    return valores[clave];
  });
}
