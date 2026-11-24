import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { ahora, fechaHora, id } from "./columnas";
import { rolUsuario } from "./enums";

// Tablas de Better Auth, renombradas.

export const usuario = pgTable(
  "usuario",
  {
    id: id(),
    nombre: text("nombre").notNull(),
    email: text("email").notNull().unique(), // siempre en minúsculas
    emailVerificado: boolean("email_verificado").notNull().default(false),
    imagenUrl: text("imagen_url"),
    rol: rolUsuario("rol").notNull().default("alumno"),
    esMenor: boolean("es_menor").notNull().default(false),
    consentimientoTutorLegal: boolean("consentimiento_tutor_legal").notNull().default(false),
    seudonimo: text("seudonimo").notNull().unique(), // el único identificador que ve la IA
    creado: ahora("creado"),
    actualizado: ahora("actualizado"),
  },
  (t) => [check("usuario_email_check", sql`${t.email} = lower(${t.email})`)],
);

/** Un método de inicio de sesión de un usuario: 'credential' (email + contraseña), 'google'... */
export const cuenta = pgTable(
  "cuenta",
  {
    id: id(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    proveedor: text("proveedor").notNull(),
    idCuentaProveedor: text("id_cuenta_proveedor").notNull(),
    passwordHash: text("password_hash"), // solo para 'credential'; lo calcula Better Auth
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    expiraAccessToken: fechaHora("expira_access_token"),
    scope: text("scope"),
    creado: ahora("creado"),
    actualizado: ahora("actualizado"),
  },
  (t) => [unique().on(t.proveedor, t.idCuentaProveedor)],
);

export const sesion = pgTable("sesion", {
  id: id(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expira: fechaHora("expira").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  creado: ahora("creado"),
  actualizado: ahora("actualizado"),
});

/** Tokens de verificación de email / enlace mágico. */
export const verificacion = pgTable("verificacion", {
  id: id(),
  identificador: text("identificador").notNull(),
  valor: text("valor").notNull(),
  expira: fechaHora("expira").notNull(),
  creado: ahora("creado"),
});

export type Usuario = typeof usuario.$inferSelect;
export type NuevoUsuario = typeof usuario.$inferInsert;
export type Cuenta = typeof cuenta.$inferSelect;
export type NuevaCuenta = typeof cuenta.$inferInsert;
export type Sesion = typeof sesion.$inferSelect;
export type NuevaSesion = typeof sesion.$inferInsert;
export type Verificacion = typeof verificacion.$inferSelect;
export type NuevaVerificacion = typeof verificacion.$inferInsert;
