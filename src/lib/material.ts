/** Lectura y escritura del material común de cada módulo (data/material/<moduloId>.json). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MaterialComun } from "./types";

const CARPETA = path.join(process.cwd(), "data", "material");

export function rutaMaterial(moduloId: string): string {
  // El id viene del catálogo, pero se sanea igualmente para no salir de la carpeta.
  return path.join(CARPETA, `${moduloId.replace(/[^a-z0-9-]/gi, "")}.json`);
}

export function leerMaterialComun(moduloId: string): MaterialComun | null {
  const ruta = rutaMaterial(moduloId);
  if (!existsSync(ruta)) return null;
  return JSON.parse(readFileSync(ruta, "utf8")) as MaterialComun;
}

export function guardarMaterialComun(material: MaterialComun): string {
  mkdirSync(CARPETA, { recursive: true });
  const ruta = rutaMaterial(material.moduloId);
  writeFileSync(ruta, JSON.stringify(material, null, 2) + "\n", "utf8");
  return ruta;
}
