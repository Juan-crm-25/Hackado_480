import "server-only";
import { randomBytes } from "node:crypto";
import { getDb, type Db } from "@/lib/db/client";
import type { Pedido } from "@/lib/db/schema";
import type { UsuarioSesion } from "../auth/roles";
import { conflicto, datosInvalidos, noEncontrado } from "../compartido/errores";
import type { IntentoPago, SesionCheckout } from "@/lib/pagos";
import type { DatosCheckout, DatosConfirmar } from "./esquemas";
import {
  crearPedido,
  existeMatricula,
  leerCursoParaPago,
  leerPedidoPendiente,
  leerPedidoPorSesion,
  marcarPagadoYMatricular,
} from "./repositorio";

/**
 * Pago SIMULADO del MVP (SPEC.md, «Compra simulada»). Imita la forma de Stripe (una `checkout.session` y un
 * `payment_intent`) pero no cobra: cualquier tarjeta vale. El precio sale siempre de la BBDD.
 * Pasar a Stripe es cambiar `confirmarPago` por Stripe Checkout y llamar a `confirmarPagoYMatricular` desde el webhook.
 */

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Id ficticio con el aspecto de los de Stripe en modo test: `cs_test_…`, `pi_test_…`. */
function idFicticio(prefijo: "cs" | "pi"): string {
  const bytes = randomBytes(24);
  return `${prefijo}_test_${Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("")}`;
}

export type { IntentoPago, SesionCheckout };

/** Crea (o reutiliza) el pedido pendiente del curso y devuelve su sesión de pago. */
export async function crearCheckout(usuario: UsuarioSesion, datos: DatosCheckout, db: Db = getDb()): Promise<SesionCheckout> {
  const curso = await leerCursoParaPago(datos.curso, db);
  if (!curso) throw noEncontrado("No encontramos ese curso");
  if (await existeMatricula(curso.id, usuario.email, db)) throw conflicto("Ya tienes este curso");

  const pedido =
    (await leerPedidoPendiente(usuario.id, curso.id, curso.precioCentimos, db)) ??
    (await crearPedido(
      {
        usuarioId: usuario.id,
        cursoId: curso.id,
        importeCentimos: curso.precioCentimos,
        moneda: curso.moneda,
        stripeSessionId: idFicticio("cs"),
      },
      db,
    ));

  return {
    id: pedido.stripeSessionId!,
    object: "checkout.session",
    amount_total: pedido.importeCentimos,
    currency: pedido.moneda,
    payment_status: "unpaid",
    curso: { slug: curso.slug, titulo: curso.titulo },
  };
}

/**
 * La función que reutilizará el webhook de Stripe: marca el pedido como pagado y crea la matrícula,
 * en una transacción e idempotente. Lanza 404 si el pedido no existe o no se puede pagar, y 409 (sin marcar
 * el pedido como pagado) si el comprador ya tenía el curso.
 */
export async function confirmarPagoYMatricular(
  datos: { stripeSessionId: string; paymentIntent: string; usuarioId?: string },
  db: Db = getDb(),
): Promise<{ pedido: Pedido; nuevo: boolean }> {
  const resultado = await marcarPagadoYMatricular(datos, db);
  if (resultado === "ya-matriculado") throw conflicto("Ya tienes este curso");
  if (!resultado) throw noEncontrado("No encontramos ese pago");
  return resultado;
}

/** Confirma el pago simulado del usuario. Cualquier tarjeta (o PayPal, Bizum, cartera) se da por buena. */
export async function confirmarPago(usuario: UsuarioSesion, datos: DatosConfirmar, db: Db = getDb()): Promise<IntentoPago> {
  const encontrado = await leerPedidoPorSesion(datos.sesion, db);
  // El pedido de otro usuario se trata como inexistente: no revela que existe.
  if (!encontrado || encontrado.pedido.usuarioId !== usuario.id) throw noEncontrado("No encontramos ese pago");
  if (datos.metodo === "gratis" && encontrado.pedido.importeCentimos > 0) {
    throw datosInvalidos(undefined, "Elige un método de pago");
  }

  const { pedido } = await confirmarPagoYMatricular(
    { stripeSessionId: datos.sesion, paymentIntent: idFicticio("pi"), usuarioId: usuario.id },
    db,
  );

  return {
    id: pedido.stripePaymentIntent!,
    object: "payment_intent",
    amount: pedido.importeCentimos,
    currency: pedido.moneda,
    status: "succeeded",
    payment_method_types: [datos.metodo],
    created: Math.floor((pedido.pagadoEn ?? new Date()).getTime() / 1000),
    pedido: { id: pedido.id, pagadoEn: (pedido.pagadoEn ?? new Date()).toISOString() },
    curso: encontrado.curso,
  };
}
