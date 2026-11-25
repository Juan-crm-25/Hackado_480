import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { curso, matricula, pedido, usuario, type Pedido } from "@/lib/db/schema";

export type CursoParaPago = { id: string; slug: string; titulo: string; precioCentimos: number; moneda: string };

/** Curso publicado por su slug, con su precio; null si no existe o no está publicado. */
export async function leerCursoParaPago(slug: string, db: Db): Promise<CursoParaPago | null> {
  const [fila] = await db
    .select({ id: curso.id, slug: curso.slug, titulo: curso.titulo, precioCentimos: curso.precioCentimos, moneda: curso.moneda })
    .from(curso)
    .where(and(eq(curso.slug, slug), eq(curso.publicado, true)))
    .limit(1);
  return fila ?? null;
}

export async function existeMatricula(cursoId: string, email: string, db: Db): Promise<boolean> {
  const [fila] = await db
    .select({ id: matricula.id })
    .from(matricula)
    .where(and(eq(matricula.cursoId, cursoId), eq(matricula.email, email)))
    .limit(1);
  return fila !== undefined;
}

/** Último pedido pendiente de este usuario y curso con este importe, para no crear uno nuevo en cada visita. */
export async function leerPedidoPendiente(usuarioId: string, cursoId: string, importeCentimos: number, db: Db) {
  const [fila] = await db
    .select()
    .from(pedido)
    .where(
      and(
        eq(pedido.usuarioId, usuarioId),
        eq(pedido.cursoId, cursoId),
        eq(pedido.importeCentimos, importeCentimos),
        eq(pedido.estado, "pendiente"),
      ),
    )
    .orderBy(desc(pedido.creado))
    .limit(1);
  return fila ?? null;
}

export async function crearPedido(
  datos: { usuarioId: string; cursoId: string; importeCentimos: number; moneda: string; stripeSessionId: string },
  db: Db,
): Promise<Pedido> {
  const [fila] = await db.insert(pedido).values(datos).returning();
  return fila;
}

/** Pedido de una sesión de pago con su curso (solo si el curso sigue publicado), o null. */
export async function leerPedidoPorSesion(stripeSessionId: string, db: Db) {
  const [fila] = await db
    .select({ pedido, curso: { slug: curso.slug, titulo: curso.titulo } })
    .from(pedido)
    .innerJoin(curso, eq(curso.id, pedido.cursoId))
    .where(and(eq(pedido.stripeSessionId, stripeSessionId), eq(curso.publicado, true)))
    .limit(1);
  return fila ?? null;
}

/**
 * Marca el pedido como pagado y crea su matrícula, en UNA transacción (docs/arquitectura.md, «Webhook de Stripe»).
 * Idempotente: si el pedido ya estaba pagado no cambia nada y devuelve el pedido tal cual.
 * - La matrícula va al email del comprador; `ON CONFLICT (curso_id, email) DO NOTHING`.
 * - `usuarioId` enlaza la matrícula a la cuenta que paga (el pago simulado lo hace la propia cuenta con sesión).
 *   El webhook de Stripe, sin sesión, lo dejará vacío y el enlace seguirá la regla del email verificado.
 * - Si ese email ya tiene el curso, NO marca el pedido como pagado (se deshace todo) y devuelve `ya-matriculado`:
 *   nunca hay un pedido pagado sin su matrícula.
 * Devuelve null si no existe el pedido o no se puede pagar (por ejemplo, fallido).
 */
export async function marcarPagadoYMatricular(
  datos: { stripeSessionId: string; paymentIntent: string; usuarioId?: string },
  db: Db,
): Promise<{ pedido: Pedido; nuevo: boolean } | "ya-matriculado" | null> {
  try {
    return await transaccionPago(datos, db);
  } catch (error) {
    if (error instanceof YaMatriculado) return "ya-matriculado";
    throw error;
  }
}

/** Se lanza dentro de la transacción para deshacerla cuando el comprador ya tenía el curso. */
class YaMatriculado extends Error {}

function transaccionPago(datos: { stripeSessionId: string; paymentIntent: string; usuarioId?: string }, db: Db) {
  return db.transaction(async (tx): Promise<{ pedido: Pedido; nuevo: boolean } | null> => {
    const [pagado] = await tx
      .update(pedido)
      .set({ estado: "pagado", pagadoEn: sql`now()`, stripePaymentIntent: datos.paymentIntent })
      .where(and(eq(pedido.stripeSessionId, datos.stripeSessionId), eq(pedido.estado, "pendiente")))
      .returning();

    if (!pagado) {
      const [existente] = await tx.select().from(pedido).where(eq(pedido.stripeSessionId, datos.stripeSessionId)).limit(1);
      return existente?.estado === "pagado" ? { pedido: existente, nuevo: false } : null;
    }

    const [comprador] = await tx.select({ email: usuario.email }).from(usuario).where(eq(usuario.id, pagado.usuarioId));
    const nuevas = await tx
      .insert(matricula)
      .values({
        cursoId: pagado.cursoId,
        email: comprador.email,
        usuarioId: datos.usuarioId ?? null,
        rolEnCurso: "alumno",
        origen: "compra",
        pedidoId: pagado.id,
      })
      .onConflictDoNothing({ target: [matricula.cursoId, matricula.email] })
      .returning({ id: matricula.id });
    if (nuevas.length === 0) throw new YaMatriculado();

    return { pedido: pagado, nuevo: true };
  });
}
