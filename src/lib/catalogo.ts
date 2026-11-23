import catalogoJson from "../../data/catalog.json";
import type { Catalogo, Curso, Modulo } from "./types";

/** El catálogo se da por cargado desde data/catalog.json (sin panel de administración). */
const catalogo = catalogoJson as Catalogo;

export function getCurso(): Curso {
  return catalogo.curso;
}

export function getModulos(): Modulo[] {
  return [...catalogo.curso.modulos].sort((a, b) => a.ordenSugerido - b.ordenSugerido);
}

export function getModulo(id: string): Modulo | undefined {
  return catalogo.curso.modulos.find((m) => m.id === id);
}
