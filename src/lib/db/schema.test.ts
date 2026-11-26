import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type {
  EstadoEjercicio,
  EstadoModulo,
  NivelMaterial,
  RolMensaje,
  TipoEjercicio,
  TipoMaterial,
  UsoEjercicio,
} from "../types";
import * as schema from "./schema";

const TABLAS = [
  "usuario", "cuenta", "sesion", "verificacion",
  "categoria", "curso", "curso_imagen", "modulo", "concepto", "clase", "documento", "etiqueta", "modulo_etiqueta",
  "pedido", "matricula",
  "material_clase", "material_personal",
  "plantilla_ejercicio", "ejercicio", "intento", "progreso",
  "evaluacion", "pregunta_evaluacion", "intento_evaluacion",
  "conversacion", "mensaje", "uso_ia", "duda_humana",
  "tema_foro", "comentario_foro", "punto_foro", "insignia", "usuario_insignia",
];

// Lista completa de una unión: si falta un valor, el tipo es `never` y tsc falla;
// si sobra uno, tsc también falla porque no cumple `T extends readonly U[]`.
type Completa<U, T extends readonly U[]> = [U] extends [T[number]] ? T : never;
const lista =
  <U>() =>
  <const T extends readonly U[]>(valores: T & Completa<U, T>) =>
    valores;

// Igualdad de tipos: el enum de la BBDD y la unión del contrato deben ser el mismo conjunto.
// Es una comprobación solo de tsc: si alguno no es `true`, `Afirmar` no compila.
type Igual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Afirmar<T extends true> = T;
type ValoresDe<E extends { enumValues: readonly string[] }> = E["enumValues"][number];
export type EnumsIgualesAlContrato = [
  Afirmar<Igual<ValoresDe<typeof schema.tipoEjercicio>, TipoEjercicio>>,
  Afirmar<Igual<ValoresDe<typeof schema.estadoEjercicio>, EstadoEjercicio>>,
  Afirmar<Igual<ValoresDe<typeof schema.usoEjercicio>, UsoEjercicio>>,
  Afirmar<Igual<ValoresDe<typeof schema.estadoModulo>, EstadoModulo>>,
  Afirmar<Igual<ValoresDe<typeof schema.tipoMaterial>, TipoMaterial>>,
  Afirmar<Igual<ValoresDe<typeof schema.nivelMaterial>, NivelMaterial>>,
  Afirmar<Igual<ValoresDe<typeof schema.rolMensaje>, RolMensaje>>,
];

describe("esquema de la BBDD", () => {
  it("exporta exactamente las 33 tablas del modelo de datos", () => {
    const nombres = (Object.values(schema) as unknown[])
      .filter((valor): valor is PgTable => valor instanceof PgTable)
      .map((tabla) => getTableConfig(tabla).name);

    expect(TABLAS).toHaveLength(33);
    expect(nombres.sort()).toEqual([...TABLAS].sort());
  });

  it("los enums coinciden con las uniones de src/lib/types.ts", () => {
    const casos: [readonly string[], readonly string[]][] = [
      [schema.tipoEjercicio.enumValues, lista<TipoEjercicio>()(["test", "respuesta_corta", "abierta", "codigo"])],
      [schema.estadoEjercicio.enumValues, lista<EstadoEjercicio>()(["borrador", "aprobado"])],
      [schema.usoEjercicio.enumValues, lista<UsoEjercicio>()(["video", "modulo", "examen"])],
      [schema.estadoModulo.enumValues, lista<EstadoModulo>()(["pendiente", "en_curso", "dominado", "completado"])],
      [schema.tipoMaterial.enumValues, lista<TipoMaterial>()(["resumen", "tarjetas", "infografia"])],
      [schema.nivelMaterial.enumValues, lista<NivelMaterial>()(["basico", "normal", "avanzado"])],
      [schema.rolMensaje.enumValues, lista<RolMensaje>()(["alumno", "tutor"])],
    ];

    for (const [enumBbdd, union] of casos) {
      expect([...enumBbdd].sort()).toEqual([...union].sort());
    }
  });

  it("el foro valora respuestas en tres niveles y distingue lo que no es respuesta (H10)", () => {
    expect(schema.validacionForo.enumValues).toEqual(["pendiente", "correcta", "aproximada", "incorrecta", "no_respuesta"]);
    expect(schema.motivoPuntoForo.enumValues).toEqual(["buena_pregunta", "buena_conducta"]);
  });
});

