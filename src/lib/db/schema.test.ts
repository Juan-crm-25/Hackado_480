import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type {
  EstadoEjercicio,
  EstadoModulo,
  NivelMaterial,
  RolMensaje,
  TipoEjercicio,
  TipoMaterial,
} from "../types";
import * as schema from "./schema";

const TABLAS = [
  "usuario", "cuenta", "sesion", "verificacion",
  "categoria", "curso", "curso_imagen", "modulo", "concepto", "clase", "documento", "etiqueta", "modulo_etiqueta",
  "pedido", "matricula",
  "material_clase", "material_personal",
  "plantilla_ejercicio", "ejercicio", "intento", "progreso",
  "evaluacion", "pregunta_evaluacion", "intento_evaluacion",
  "conversacion", "mensaje", "uso_ia",
  "tema_foro", "comentario_foro", "insignia", "usuario_insignia",
];

// Lista completa de una unión: si falta un valor, el tipo es `never` y tsc falla; si sobra, falla `satisfies`.
type Completa<U, T extends readonly U[]> = [U] extends [T[number]] ? T : never;
const lista =
  <U>() =>
  <const T extends readonly U[]>(valores: T & Completa<U, T>) =>
    valores;

// Igualdad de tipos: el enum de la BBDD y la unión del contrato deben ser el mismo conjunto.
type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type ValoresDe<E extends { enumValues: readonly string[] }> = E["enumValues"][number];
const mismosTipos: [
  Igual<ValoresDe<typeof schema.tipoEjercicio>, TipoEjercicio>,
  Igual<ValoresDe<typeof schema.estadoEjercicio>, EstadoEjercicio>,
  Igual<ValoresDe<typeof schema.estadoModulo>, EstadoModulo>,
  Igual<ValoresDe<typeof schema.tipoMaterial>, TipoMaterial>,
  Igual<ValoresDe<typeof schema.nivelMaterial>, NivelMaterial>,
  Igual<ValoresDe<typeof schema.rolMensaje>, RolMensaje>,
] = [true, true, true, true, true, true];

describe("esquema de la BBDD", () => {
  it("exporta exactamente las 31 tablas del modelo de datos", () => {
    const nombres = (Object.values(schema) as unknown[])
      .filter((valor): valor is PgTable => valor instanceof PgTable)
      .map((tabla) => getTableConfig(tabla).name);

    expect(TABLAS).toHaveLength(31);
    expect(nombres.sort()).toEqual([...TABLAS].sort());
  });

  it("los enums coinciden con las uniones de src/lib/types.ts", () => {
    const casos: [readonly string[], readonly string[]][] = [
      [schema.tipoEjercicio.enumValues, lista<TipoEjercicio>()(["test", "respuesta_corta", "abierta", "codigo"])],
      [schema.estadoEjercicio.enumValues, lista<EstadoEjercicio>()(["borrador", "aprobado"])],
      [schema.estadoModulo.enumValues, lista<EstadoModulo>()(["pendiente", "en_curso", "dominado", "completado"])],
      [schema.tipoMaterial.enumValues, lista<TipoMaterial>()(["resumen", "tarjetas", "infografia"])],
      [schema.nivelMaterial.enumValues, lista<NivelMaterial>()(["basico", "normal", "avanzado"])],
      [schema.rolMensaje.enumValues, lista<RolMensaje>()(["alumno", "tutor"])],
    ];

    expect(mismosTipos.every(Boolean)).toBe(true);
    for (const [enumBbdd, union] of casos) {
      expect([...enumBbdd].sort()).toEqual([...union].sort());
    }
  });
});
