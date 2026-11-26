import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, integer, jsonb, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { usuario } from "./usuarios";
import { clase, modulo } from "./catalogo";
import { ahora, fechaHora, id } from "./columnas";
import { motivoPuntoForo, validacionForo, validadorForo } from "./enums";

/** Regla para conseguir una insignia, evaluada en código: { respuestasBuenas: 3, etiqueta: "css" }. */
export interface CriterioInsignia {
  respuestasBuenas: number;
  etiqueta?: string;
}

/** Una duda del foro. El foro es por módulo (H10); la clase (vídeo) es opcional, por si la duda es de un vídeo concreto. */
export const temaForo = pgTable("tema_foro", {
  id: id(),
  moduloId: uuid("modulo_id")
    .notNull()
    .references(() => modulo.id, { onDelete: "cascade" }),
  claseId: uuid("clase_id").references(() => clase.id, { onDelete: "set null" }),
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
 * Los puntos de las respuestas no se guardan: se calculan de la validación (correcta +10, aproximada +5).
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

/**
 * Puntos que da el profesor del curso por una buena pregunta (un tema) o por buena conducta (un tema o un
 * comentario): +1, +3 o +6. Estos sí se guardan porque no se pueden calcular. Uno por tema o comentario:
 * el profesor lo cambia, no lo acumula.
 */
export const puntoForo = pgTable(
  "punto_foro",
  {
    id: id(),
    profesorId: uuid("profesor_id").references(() => usuario.id, { onDelete: "set null" }),
    alumnoId: uuid("alumno_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    temaId: uuid("tema_id").references(() => temaForo.id, { onDelete: "cascade" }),
    comentarioId: uuid("comentario_id").references(() => comentarioForo.id, { onDelete: "cascade" }),
    puntos: integer("puntos").notNull(),
    motivo: motivoPuntoForo("motivo").notNull(),
    creado: ahora("creado"),
  },
  (t) => [
    check("punto_foro_puntos_check", sql`${t.puntos} IN (1, 3, 6)`),
    check("punto_foro_destino_check", sql`(${t.temaId} IS NULL) <> (${t.comentarioId} IS NULL)`),
    unique("punto_foro_tema_unique").on(t.temaId),
    unique("punto_foro_comentario_unique").on(t.comentarioId),
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
export type PuntoForo = typeof puntoForo.$inferSelect;
export type NuevoPuntoForo = typeof puntoForo.$inferInsert;
export type Insignia = typeof insignia.$inferSelect;
export type NuevaInsignia = typeof insignia.$inferInsert;
export type UsuarioInsignia = typeof usuarioInsignia.$inferSelect;
export type NuevoUsuarioInsignia = typeof usuarioInsignia.$inferInsert;
