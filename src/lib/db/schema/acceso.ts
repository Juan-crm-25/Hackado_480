import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { usuario } from "./usuarios";
import { curso, modulo } from "./catalogo";
import { ahora, fechaHora, id } from "./columnas";
import { estadoPedido, origenMatricula, rolEnCurso } from "./enums";

// Compra y matrícula. El dinero va en céntimos, como en Stripe.

export const pedido = pgTable(
  "pedido",
  {
    id: id(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id),
    importeCentimos: integer("importe_centimos").notNull(),
    moneda: text("moneda").notNull().default("eur"),
    estado: estadoPedido("estado").notNull().default("pendiente"),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntent: text("stripe_payment_intent"),
    creado: ahora("creado"),
    pagadoEn: fechaHora("pagado_en"),
  },
  (t) => [check("pedido_importe_centimos_check", sql`${t.importeCentimos} >= 0`)],
);

/** El acceso a un curso se da a un EMAIL, aunque esa persona aún no se haya registrado. */
export const matricula = pgTable(
  "matricula",
  {
    id: id(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    email: text("email").notNull(), // en minúsculas, para que coincida con usuario.email
    usuarioId: uuid("usuario_id").references(() => usuario.id, { onDelete: "set null" }), // se enlaza al entrar por primera vez
    rolEnCurso: rolEnCurso("rol_en_curso").notNull().default("alumno"),
    origen: origenMatricula("origen").notNull(),
    pedidoId: uuid("pedido_id").references(() => pedido.id), // solo con origen 'compra'; lo crea el webhook de Stripe
    // Ruta personal que fija el diagnóstico. NULL = orden por defecto (modulo.orden_sugerido).
    moduloPrincipalId: uuid("modulo_principal_id").references(() => modulo.id, { onDelete: "set null" }),
    // PostgreSQL no comprueba claves ajenas dentro de una lista: el código comprueba que son módulos de este curso.
    ordenModulos: uuid("orden_modulos").array(),
    creado: ahora("creado"),
  },
  (t) => [
    unique().on(t.cursoId, t.email),
    check("matricula_email_check", sql`${t.email} = lower(${t.email})`),
    // Una compra siempre tiene su pedido; una invitación nunca.
    check("matricula_pedido_check", sql`(${t.origen} = 'compra') = (${t.pedidoId} IS NOT NULL)`),
  ],
);

export type Pedido = typeof pedido.$inferSelect;
export type NuevoPedido = typeof pedido.$inferInsert;
export type Matricula = typeof matricula.$inferSelect;
export type NuevaMatricula = typeof matricula.$inferInsert;
