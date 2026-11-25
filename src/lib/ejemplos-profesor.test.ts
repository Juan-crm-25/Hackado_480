/**
 * Ejemplos del profesor por módulo (#12): data/ejemplos-profesor/<moduloId>.json.
 *
 * Son el origen del seed de la tabla `plantilla_ejercicio` y los usa el generador de
 * ejercicios (#4). Este test comprueba que hay uno por módulo del catálogo y que cada
 * fichero cumple el formato `PlantillaEjercicios` de types.ts, sin campos de más.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Catalogo, EjercicioBase, PlantillaEjercicios, TipoEjercicio } from "./types";

const DATA = path.join(process.cwd(), "data");
const CATALOGO = path.join(DATA, "catalog.json");
const CARPETA = path.join(DATA, "ejemplos-profesor");

const TIPOS: TipoEjercicio[] = ["test", "respuesta_corta", "abierta", "codigo"];
const CAMPOS_PLANTILLA = ["moduloId", "tipos", "ejemplos", "indicaciones"];
const CAMPOS_EJEMPLO = ["tipo", "enunciado", "opciones", "solucion", "rubrica"];

const textoNoVacio = (valor: unknown) => typeof valor === "string" && valor.trim().length > 0;

// Cuando el código lea de la BBDD y se borren los ficheros de data/, este test se salta solo.
const modulos = existsSync(CATALOGO)
  ? (JSON.parse(readFileSync(CATALOGO, "utf8")) as Catalogo).curso.modulos
  : [];

function leerPlantilla(moduloId: string): PlantillaEjercicios {
  return JSON.parse(readFileSync(path.join(CARPETA, `${moduloId}.json`), "utf8"));
}

/** Reglas de cada ejemplo según su tipo. */
function comprobarEjemplo(ejemplo: EjercicioBase) {
  expect(Object.keys(ejemplo).filter((campo) => !CAMPOS_EJEMPLO.includes(campo))).toEqual([]);
  expect(TIPOS).toContain(ejemplo.tipo);
  expect(textoNoVacio(ejemplo.enunciado)).toBe(true);

  switch (ejemplo.tipo) {
    case "test": {
      // Al menos 2 opciones, todas distintas, y la solución es el índice de la correcta.
      const opciones = ejemplo.opciones ?? [];
      expect(opciones.length).toBeGreaterThanOrEqual(2);
      expect(opciones.every(textoNoVacio)).toBe(true);
      expect(new Set(opciones).size).toBe(opciones.length);
      expect(Number.isInteger(ejemplo.solucion)).toBe(true);
      expect(ejemplo.solucion as number).toBeGreaterThanOrEqual(0);
      expect(ejemplo.solucion as number).toBeLessThan(opciones.length);
      break;
    }
    case "respuesta_corta":
      // La respuesta esperada, en texto.
      expect(ejemplo.opciones).toBeUndefined();
      expect(textoNoVacio(ejemplo.solucion)).toBe(true);
      break;
    case "abierta":
    case "codigo":
      // Se corrigen con rúbrica. En «codigo» la solución, si la hay, es un código de referencia.
      expect(ejemplo.opciones).toBeUndefined();
      expect(textoNoVacio(ejemplo.rubrica)).toBe(true);
      if (ejemplo.solucion !== undefined) expect(textoNoVacio(ejemplo.solucion)).toBe(true);
      break;
  }
}

describe.skipIf(modulos.length === 0)("ejemplos del profesor (data/ejemplos-profesor/)", () => {
  it("hay un fichero por cada módulo del catálogo, y ninguno más", () => {
    const ficheros = existsSync(CARPETA) ? readdirSync(CARPETA).sort() : [];
    expect(ficheros).toEqual(modulos.map((m) => `${m.id}.json`).sort());
  });

  describe.each(modulos.map((m) => m.id))("%s", (moduloId) => {
    it("es una PlantillaEjercicios de su módulo, sin campos de más", () => {
      const plantilla = leerPlantilla(moduloId);
      expect(Object.keys(plantilla).filter((campo) => !CAMPOS_PLANTILLA.includes(campo))).toEqual([]);
      expect(plantilla.moduloId).toBe(moduloId);
      if (plantilla.indicaciones !== undefined) expect(textoNoVacio(plantilla.indicaciones)).toBe(true);
    });

    it("tiene 2 o 3 ejemplos de al menos 2 tipos distintos", () => {
      const { ejemplos } = leerPlantilla(moduloId);
      expect(ejemplos.length).toBeGreaterThanOrEqual(2);
      expect(ejemplos.length).toBeLessThanOrEqual(3);
      expect(new Set(ejemplos.map((e) => e.tipo)).size).toBeGreaterThanOrEqual(2);
    });

    it("«tipos» son exactamente los tipos que usan sus ejemplos, sin repetir", () => {
      const { tipos, ejemplos } = leerPlantilla(moduloId);
      expect(new Set(tipos).size).toBe(tipos.length);
      expect([...tipos].sort()).toEqual([...new Set(ejemplos.map((e) => e.tipo))].sort());
    });

    it("cada ejemplo cumple las reglas de su tipo (opciones, solución o rúbrica)", () => {
      for (const ejemplo of leerPlantilla(moduloId).ejemplos) comprobarEjemplo(ejemplo);
    });
  });
});
