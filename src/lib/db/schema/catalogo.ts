import { sql } from "drizzle-orm";
import { boolean, check, integer, numeric, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { ahora, id } from "./columnas";
import { tipoDocumento, usoImagen } from "./enums";

// Catálogo: categoría > curso > módulo > clase. Los temas son etiquetas de los módulos.

/** Para filtrar el catálogo: "programacion", "ia", "cocina"... */
export const categoria = pgTable("categoria", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  iconoUrl: text("icono_url"),
  orden: integer("orden").notNull().default(0),
});

export const curso = pgTable(
  "curso",
  {
    id: id(),
    categoriaId: uuid("categoria_id")
      .notNull()
      .references(() => categoria.id),
    slug: text("slug").notNull().unique(), // p. ej. "intro-desarrollo-web"
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion").notNull(),
    precioCentimos: integer("precio_centimos").notNull().default(0),
    moneda: text("moneda").notNull().default("eur"),
    publicado: boolean("publicado").notNull().default(false),
    creado: ahora("creado"),
    actualizado: ahora("actualizado"),
  },
  (t) => [check("curso_precio_centimos_check", sql`${t.precioCentimos} >= 0`)],
);

/** El fichero vive en R2; aquí solo su URL. */
export const cursoImagen = pgTable("curso_imagen", {
  id: id(),
  cursoId: uuid("curso_id")
    .notNull()
    .references(() => curso.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  titulo: text("titulo").notNull(), // dice dónde va, p. ej. "Banner de la home"
  uso: usoImagen("uso").notNull(),
  orden: integer("orden").notNull().default(0),
  creado: ahora("creado"),
});

export const modulo = pgTable(
  "modulo",
  {
    id: id(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // p. ej. "m2-css"
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion").notNull(),
    ordenSugerido: integer("orden_sugerido").notNull(),
  },
  (t) => [unique().on(t.cursoId, t.slug)],
);

export const concepto = pgTable(
  "concepto",
  {
    id: id(),
    moduloId: uuid("modulo_id")
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // p. ej. "css-especificidad"
    nombre: text("nombre").notNull(),
  },
  (t) => [unique().on(t.moduloId, t.slug)],
);

export const clase = pgTable(
  "clase",
  {
    id: id(),
    moduloId: uuid("modulo_id")
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(), // p. ej. "v04"
    titulo: text("titulo").notNull(),
    videoUrl: text("video_url").notNull(), // enlace de YouTube
    duracionSegundos: integer("duracion_segundos").notNull(),
    orden: integer("orden").notNull(),
  },
  (t) => [unique().on(t.moduloId, t.slug)],
);

/** Markdown largo de una clase: transcripción o apuntes. */
export const documento = pgTable("documento", {
  id: id(),
  claseId: uuid("clase_id")
    .notNull()
    .references(() => clase.id, { onDelete: "cascade" }),
  tipo: tipoDocumento("tipo").notNull(),
  titulo: text("titulo").notNull(),
  contenidoMd: text("contenido_md").notNull(), // las transcripciones conservan las marcas [mm:ss]
  creado: ahora("creado"),
  actualizado: ahora("actualizado"),
});

/** P. ej. "html", "css", "frameworks", "logica". */
export const etiqueta = pgTable("etiqueta", {
  id: id(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
});

/** Etiquetas de un módulo; el diagnóstico las usa para elegir el módulo que más encaja. */
export const moduloEtiqueta = pgTable(
  "modulo_etiqueta",
  {
    moduloId: uuid("modulo_id")
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" }),
    etiquetaId: uuid("etiqueta_id")
      .notNull()
      .references(() => etiqueta.id, { onDelete: "cascade" }),
    // Cuánto pesa la etiqueta en el módulo, entre 0 (excluido) y 1.
    peso: numeric("peso", { precision: 3, scale: 2, mode: "number" }).notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.moduloId, t.etiquetaId] }),
    check("modulo_etiqueta_peso_check", sql`${t.peso} > 0 AND ${t.peso} <= 1`),
  ],
);

export type Categoria = typeof categoria.$inferSelect;
export type NuevaCategoria = typeof categoria.$inferInsert;
export type Curso = typeof curso.$inferSelect;
export type NuevoCurso = typeof curso.$inferInsert;
export type CursoImagen = typeof cursoImagen.$inferSelect;
export type NuevoCursoImagen = typeof cursoImagen.$inferInsert;
export type Modulo = typeof modulo.$inferSelect;
export type NuevoModulo = typeof modulo.$inferInsert;
export type Concepto = typeof concepto.$inferSelect;
export type NuevoConcepto = typeof concepto.$inferInsert;
export type Clase = typeof clase.$inferSelect;
export type NuevaClase = typeof clase.$inferInsert;
export type Documento = typeof documento.$inferSelect;
export type NuevoDocumento = typeof documento.$inferInsert;
export type Etiqueta = typeof etiqueta.$inferSelect;
export type NuevaEtiqueta = typeof etiqueta.$inferInsert;
export type ModuloEtiqueta = typeof moduloEtiqueta.$inferSelect;
export type NuevoModuloEtiqueta = typeof moduloEtiqueta.$inferInsert;
