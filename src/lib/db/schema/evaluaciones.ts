import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import type { EjercicioBase } from "../../types";
import { usuario } from "./usuarios";
import { curso, modulo } from "./catalogo";
import { ahora, id } from "./columnas";
import { tipoEjercicio, tipoEvaluacion } from "./enums";

/**
 * Opción de una pregunta. En el diagnóstico cada opción suma puntos a unas etiquetas
 * (`{ texto, etiquetas: { css: 3 } }`); en tests y exámenes solo lleva `texto` y la respuesta va en `solucion`.
 */
export interface OpcionPregunta {
  texto: string;
  etiquetas?: Record<string, number>;
}

/** Diagnóstico, test o examen de un curso (o de un módulo). */
export const evaluacion = pgTable(
  "evaluacion",
  {
    id: id(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    moduloId: uuid("modulo_id").references(() => modulo.id, { onDelete: "cascade" }), // NULL = todo el curso
    tipo: tipoEvaluacion("tipo").notNull(),
    titulo: text("titulo").notNull(),
    // P. ej. 5.00 sobre 10; NULL en el diagnóstico (nadie lo suspende).
    notaAprobado: numeric("nota_aprobado", { precision: 5, scale: 2, mode: "number" }),
    creado: ahora("creado"),
  },
  (t) => [check("evaluacion_nota_aprobado_check", sql`${t.tipo} = 'diagnostico' OR ${t.notaAprobado} IS NOT NULL`)],
);

export const preguntaEvaluacion = pgTable(
  "pregunta_evaluacion",
  {
    id: id(),
    evaluacionId: uuid("evaluacion_id")
      .notNull()
      .references(() => evaluacion.id, { onDelete: "cascade" }),
    orden: integer("orden").notNull(),
    tipo: tipoEjercicio("tipo").notNull(),
    enunciado: text("enunciado").notNull(),
    opciones: jsonb("opciones").$type<OpcionPregunta[]>(),
    solucion: jsonb("solucion").$type<NonNullable<EjercicioBase["solucion"]>>(),
    rubrica: text("rubrica"),
    puntos: numeric("puntos", { precision: 5, scale: 2, mode: "number" }).notNull().default(1),
  },
  (t) => [unique().on(t.evaluacionId, t.orden)],
);

export const intentoEvaluacion = pgTable("intento_evaluacion", {
  id: id(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  evaluacionId: uuid("evaluacion_id")
    .notNull()
    .references(() => evaluacion.id, { onDelete: "cascade" }),
  respuestas: jsonb("respuestas").$type<Record<string, string | number>>().notNull(), // { "<pregunta_id>": respuesta }
  nota: numeric("nota", { precision: 5, scale: 2, mode: "number" }), // tests y exámenes
  aprobado: boolean("aprobado"), // tests y exámenes
  porcentajesEtiquetas: jsonb("porcentajes_etiquetas").$type<Record<string, number>>(), // diagnóstico: { "css": 0.6 }
  fecha: ahora("fecha"),
});

export type Evaluacion = typeof evaluacion.$inferSelect;
export type NuevaEvaluacion = typeof evaluacion.$inferInsert;
export type PreguntaEvaluacion = typeof preguntaEvaluacion.$inferSelect;
export type NuevaPreguntaEvaluacion = typeof preguntaEvaluacion.$inferInsert;
export type IntentoEvaluacion = typeof intentoEvaluacion.$inferSelect;
export type NuevoIntentoEvaluacion = typeof intentoEvaluacion.$inferInsert;
