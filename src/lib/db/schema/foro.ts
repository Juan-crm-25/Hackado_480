import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, jsonb, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { usuario } from "./usuarios";
import { clase } from "./catalogo";
import { ahora, fechaHora, id } from "./columnas";
import { validacionForo, validadorForo } from "./enums";

/** Regla para conseguir una insignia, evaluada en código: { respuestasBuenas: 3, etiqueta: "css" }. */
export interface CriterioInsignia {
  respuestasBuenas: number;
  etiqueta?: string;
}

export const temaForo = pgTable("tema_foro", {
  id: id(),
  claseId: uuid("clase_id")
    .notNull()
    .references(() => clase.id, { onDelete: "cascade" }),
  autorId: uuid("autor_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  cuerpo: text("cuerpo").notNull(),
  creado: ahora("creado"),
  actualizado: ahora("actualizado"),
});

/**
 * Valida la IA (con el texto filtrado) o un profesor, y el profesor prevalece.
 * Los puntos no se guardan: se calculan a partir de los comentarios validados como buenos.
 */
export const comentarioForo = pgTable(
  "comentario_foro",
  {
    id: id(),
    temaId: uuid("tema_id")
      .notNull()
      .references(() => temaForo.id, { onDelete: "cascade" }),
    autorId: uuid("autor_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    respuestaAId: uuid("respuesta_a_id").references((): AnyPgColumn => comentarioForo.id, { onDelete: "cascade" }),
    cuerpo: text("cuerpo").notNull(),
    validacion: validacionForo("validacion").notNull().default("pendiente"),
    validadoPor: validadorForo("validado_por"),
    profesorId: uuid("profesor_id").references(() => usuario.id, { onDelete: "set null" }), // solo si valida un profesor
    validadoEn: fechaHora("validado_en"),
    creado: ahora("creado"),
  },
  (t) => [
    // Pendiente = nadie lo ha validado; validado = se sabe quién y cuándo.
    check(
      "comentario_foro_validacion_check",
      sql`(${t.validacion} = 'pendiente') = (${t.validadoPor} IS NULL AND ${t.validadoEn} IS NULL)`,
    ),
    // Al revés no se exige a propósito: si se borra la cuenta del profesor, profesor_id pasa a NULL y la validación se conserva.
    check("comentario_foro_profesor_check", sql`${t.profesorId} IS NULL OR ${t.validadoPor} = 'profesor'`),
  ],
);

/** P. ej. "Primera buena respuesta", "Experto en CSS". */
export const insignia = pgTable("insignia", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion").notNull(),
  iconoUrl: text("icono_url"),
  criterio: jsonb("criterio").$type<CriterioInsignia>().notNull(),
});

export const usuarioInsignia = pgTable(
  "usuario_insignia",
  {
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    insigniaId: uuid("insignia_id")
      .notNull()
      .references(() => insignia.id, { onDelete: "cascade" }),
    obtenida: ahora("obtenida"),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.insigniaId] })], // cada insignia se consigue una sola vez
);

export type TemaForo = typeof temaForo.$inferSelect;
export type NuevoTemaForo = typeof temaForo.$inferInsert;
export type ComentarioForo = typeof comentarioForo.$inferSelect;
export type NuevoComentarioForo = typeof comentarioForo.$inferInsert;
export type Insignia = typeof insignia.$inferSelect;
export type NuevaInsignia = typeof insignia.$inferInsert;
export type UsuarioInsignia = typeof usuarioInsignia.$inferSelect;
export type NuevoUsuarioInsignia = typeof usuarioInsignia.$inferInsert;
