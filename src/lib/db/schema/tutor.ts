import { sql } from "drizzle-orm";
import { check, date, integer, jsonb, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import type { ReferenciaVideo } from "../../types";
import { usuario } from "./usuarios";
import { modulo } from "./catalogo";
import { ahora, fechaHora, id } from "./columnas";
import { rolMensaje } from "./enums";

export const conversacion = pgTable("conversacion", {
  id: id(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  moduloId: uuid("modulo_id")
    .notNull()
    .references(() => modulo.id, { onDelete: "cascade" }),
  creada: ahora("creada"),
  caduca: fechaHora("caduca")
    .notNull()
    .default(sql`now() + interval '90 days'`), // retención RGPD
});

export const mensaje = pgTable("mensaje", {
  id: id(),
  conversacionId: uuid("conversacion_id")
    .notNull()
    .references(() => conversacion.id, { onDelete: "cascade" }),
  rol: rolMensaje("rol").notNull(),
  texto: text("texto").notNull(), // ya filtrado (sin datos personales)
  fuentes: jsonb("fuentes").$type<ReferenciaVideo[]>(),
  fecha: ahora("fecha"),
});

/**
 * Duda que el alumno pasa a un tutor humano (H9): una pregunta suya al tutor IA que el profesor del curso
 * responde desde el Radar. La respuesta la escribe el profesor, sin IA.
 */
export const dudaHumana = pgTable(
  "duda_humana",
  {
    id: id(),
    // La pregunta del alumno (rol 'alumno'). Una pregunta solo se puede pasar una vez.
    mensajeId: uuid("mensaje_id")
      .notNull()
      .unique()
      .references(() => mensaje.id, { onDelete: "cascade" }),
    creada: ahora("creada"),
    respuesta: text("respuesta"),
    respondidaPor: uuid("respondida_por").references(() => usuario.id, { onDelete: "set null" }),
    respondida: fechaHora("respondida"),
  },
  (t) => [
    // O está pendiente (sin respuesta ni fecha) o respondida (con las dos).
    check("duda_humana_respuesta_check", sql`(${t.respuesta} IS NULL) = (${t.respondida} IS NULL)`),
  ],
);

/** Cupo diario de IA por alumno. */
export const usoIa = pgTable(
  "uso_ia",
  {
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    dia: date("dia").notNull(),
    total: integer("total").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.dia] })],
);

export type Conversacion = typeof conversacion.$inferSelect;
export type NuevaConversacion = typeof conversacion.$inferInsert;
export type Mensaje = typeof mensaje.$inferSelect;
export type NuevoMensaje = typeof mensaje.$inferInsert;
export type UsoIa = typeof usoIa.$inferSelect;
export type NuevoUsoIa = typeof usoIa.$inferInsert;
export type DudaHumana = typeof dudaHumana.$inferSelect;
export type NuevaDudaHumana = typeof dudaHumana.$inferInsert;
