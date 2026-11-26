import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, numeric, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import type { EjercicioBase, Intento as IntentoApi } from "../../types";
import { usuario } from "./usuarios";
import { clase, concepto, modulo } from "./catalogo";
import { ahora, id } from "./columnas";
import { estadoEjercicio, estadoModulo, tipoEjercicio, usoEjercicio } from "./enums";

type Solucion = NonNullable<EjercicioBase["solucion"]>;

/** Ejemplos que escribe el profesor para un módulo. */
export const plantillaEjercicio = pgTable("plantilla_ejercicio", {
  id: id(),
  moduloId: uuid("modulo_id")
    .notNull()
    .unique()
    .references(() => modulo.id, { onDelete: "cascade" }),
  tipos: tipoEjercicio("tipos").array().notNull(),
  ejemplos: jsonb("ejemplos").$type<EjercicioBase[]>().notNull(),
  indicaciones: text("indicaciones"),
});

export const ejercicio = pgTable("ejercicio", {
  id: id(),
  moduloId: uuid("modulo_id")
    .notNull()
    .references(() => modulo.id, { onDelete: "cascade" }),
  conceptoId: uuid("concepto_id")
    .notNull()
    .references(() => concepto.id),
  claseId: uuid("clase_id")
    .notNull()
    .references(() => clase.id), // vídeo que hay que repasar
  segundoReferencia: integer("segundo_referencia").notNull().default(0), // momento exacto que hay que repasar
  tipo: tipoEjercicio("tipo").notNull(),
  // Test de vídeo, de módulo o examen del curso. Por defecto «modulo»: los ejercicios de antes eran todos de módulo.
  uso: usoEjercicio("uso").notNull().default("modulo"),
  enunciado: text("enunciado").notNull(),
  opciones: jsonb("opciones").$type<string[]>(),
  solucion: jsonb("solucion").$type<Solucion>(),
  rubrica: text("rubrica"),
  estado: estadoEjercicio("estado").notNull().default("borrador"),
  creado: ahora("creado"),
});

export const intento = pgTable(
  "intento",
  {
    id: id(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    ejercicioId: uuid("ejercicio_id")
      .notNull()
      .references(() => ejercicio.id, { onDelete: "cascade" }),
    respuesta: jsonb("respuesta").$type<IntentoApi["respuesta"]>().notNull(),
    puntuacion: numeric("puntuacion", { precision: 3, scale: 2, mode: "number" }).notNull(), // de 0 a 1
    correcto: boolean("correcto").notNull(),
    feedback: text("feedback").notNull(),
    repasarClaseId: uuid("repasar_clase_id").references(() => clase.id),
    repasarSegundo: integer("repasar_segundo"),
    revisionHumana: boolean("revision_humana").notNull().default(false),
    fecha: ahora("fecha"),
  },
  (t) => [check("intento_puntuacion_check", sql`${t.puntuacion} BETWEEN 0 AND 1`)],
);

export const progreso = pgTable(
  "progreso",
  {
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    moduloId: uuid("modulo_id")
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" }),
    estado: estadoModulo("estado").notNull().default("pendiente"),
    // Aciertos por concepto, de 0 a 1: { "css-especificidad": 0.4 }
    aciertosPorConcepto: jsonb("aciertos_por_concepto").$type<Record<string, number>>().notNull().default({}),
    actualizado: ahora("actualizado"),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.moduloId] })],
);

export type PlantillaEjercicio = typeof plantillaEjercicio.$inferSelect;
export type NuevaPlantillaEjercicio = typeof plantillaEjercicio.$inferInsert;
export type Ejercicio = typeof ejercicio.$inferSelect;
export type NuevoEjercicio = typeof ejercicio.$inferInsert;
export type Intento = typeof intento.$inferSelect;
export type NuevoIntento = typeof intento.$inferInsert;
export type Progreso = typeof progreso.$inferSelect;
export type NuevoProgreso = typeof progreso.$inferInsert;
