import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { ahora, id } from "./columnas";
import { tipoMovimientoPuntos } from "./enums";
import { usuario } from "./usuarios";

/**
 * Movimientos del saldo de puntos del perfil (premios). Los puntos del foro se calculan y no se guardan; aquí solo
 * va lo que los cambia:
 * - `canje`: canjear un premio resta sus puntos (negativo). Cada premio se canjea una vez por alumno.
 * - `demo`: los botones «+100 puntos» y «+1000 puntos» del MVP, para poder enseñar el canje (positivo).
 * Saldo = puntos del foro + suma de movimientos. Los premios son datos de demo (src/lib/demo/premios.ts): `premio`
 * guarda su id de texto, no hay tabla de premios.
 */
export const movimientoPuntos = pgTable(
  "movimiento_puntos",
  {
    id: id(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    tipo: tipoMovimientoPuntos("tipo").notNull(),
    /** Id del premio canjeado (solo en los canjes). */
    premio: text("premio"),
    puntos: integer("puntos").notNull(),
    creado: ahora("creado"),
  },
  (t) => [
    check(
      "movimiento_puntos_tipo_check",
      sql`(${t.tipo} = 'canje' AND ${t.premio} IS NOT NULL AND ${t.puntos} < 0) OR (${t.tipo} = 'demo' AND ${t.premio} IS NULL AND ${t.puntos} > 0)`,
    ),
    uniqueIndex("movimiento_puntos_canje_unique").on(t.usuarioId, t.premio).where(sql`${t.premio} IS NOT NULL`),
    index("movimiento_puntos_usuario_idx").on(t.usuarioId),
  ],
);
