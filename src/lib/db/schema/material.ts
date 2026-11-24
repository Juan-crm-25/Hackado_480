import { sql } from "drizzle-orm";
import { boolean, check, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import type { Infografia, SeccionResumen, Tarjeta } from "../../types";
import { usuario } from "./usuarios";
import { clase, concepto, modulo } from "./catalogo";
import { ahora, id } from "./columnas";
import { nivelMaterial, tipoMaterial, tipoMaterialPersonal } from "./enums";

// Material generado por la IA: se genera una vez y se reutiliza (ver docs/bbdd/README.md, apartado 4).

/** Material común de una clase: lo comparten todos sus alumnos. */
export const materialClase = pgTable(
  "material_clase",
  {
    id: id(),
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clase.id, { onDelete: "cascade" }),
    tipo: tipoMaterial("tipo").notNull(),
    // El formato depende de `tipo`: resumen, tarjetas o infografía.
    contenido: jsonb("contenido").$type<SeccionResumen[] | Tarjeta[] | Infografia[]>().notNull(),
    modelo: text("modelo").notNull(), // modelo que lo generó, para trazabilidad
    revisado: boolean("revisado").notNull().default(false),
    generado: ahora("generado"),
  },
  (t) => [unique().on(t.claseId, t.tipo)], // evita generarlo dos veces
);

/** Material que la IA genera a petición de UN alumno. */
export const materialPersonal = pgTable(
  "material_personal",
  {
    id: id(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    moduloId: uuid("modulo_id")
      .notNull()
      .references(() => modulo.id, { onDelete: "cascade" }),
    conceptoId: uuid("concepto_id").references(() => concepto.id),
    tipo: tipoMaterialPersonal("tipo").notNull(),
    nivel: nivelMaterial("nivel").notNull().default("normal"),
    enfoque: text("enfoque"),
    contenido: jsonb("contenido").$type<SeccionResumen[] | Tarjeta[]>().notNull(),
    generado: ahora("generado"),
  },
  (t) => [check("material_personal_enfoque_check", sql`char_length(${t.enfoque}) <= 200`)],
);

export type MaterialClase = typeof materialClase.$inferSelect;
export type NuevoMaterialClase = typeof materialClase.$inferInsert;
export type MaterialPersonal = typeof materialPersonal.$inferSelect;
export type NuevoMaterialPersonal = typeof materialPersonal.$inferInsert;
