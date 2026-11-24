import { timestamp, uuid } from "drizzle-orm/pg-core";

// Columnas que se repiten en casi todas las tablas.

export const id = () => uuid("id").primaryKey().defaultRandom();

export const fechaHora = (nombre: string) => timestamp(nombre, { withTimezone: true });

/** Marca de tiempo obligatoria que por defecto es «ahora» (creado, actualizado, fecha...). */
export const ahora = (nombre: string) => fechaHora(nombre).notNull().defaultNow();
