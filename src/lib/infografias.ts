/** Lectura y escritura de las infografías comunes de cada módulo (data/infografias/<moduloId>.json). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { InfografiasModulo } from "./types";

const CARPETA = path.join(process.cwd(), "data", "infografias");

export function rutaInfografias(moduloId: string): string {
  return path.join(CARPETA, `${moduloId.replace(/[^a-z0-9-]/gi, "")}.json`);
}

export function leerInfografias(moduloId: string): InfografiasModulo | null {
  const ruta = rutaInfografias(moduloId);
  return existsSync(ruta) ? (JSON.parse(readFileSync(ruta, "utf8")) as InfografiasModulo) : null;
}

/** Lo que ven los alumnos: solo si una persona las ha revisado. */
export function leerInfografiasPublicadas(moduloId: string): InfografiasModulo | null {
  const datos = leerInfografias(moduloId);
  return datos?.revisado ? datos : null;
}

export function guardarInfografias(datos: InfografiasModulo): string {
  mkdirSync(CARPETA, { recursive: true });
  const ruta = rutaInfografias(datos.moduloId);
  writeFileSync(ruta, JSON.stringify(datos, null, 2) + "\n", "utf8");
  return ruta;
}
