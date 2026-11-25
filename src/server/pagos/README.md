# pagos

Compra simulada con Stripe en modo test: crea el pedido y la sesión de Checkout. El webhook lee el cuerpo en bruto, comprueba la firma y es idempotente: marca el pedido como pagado y crea la matrícula en una sola transacción, solo si el pago está hecho y el importe cuadra (ver docs/arquitectura.md, «Webhook de Stripe»).

- **Tablas:** pedido (y matricula a través de matriculas)
- **Endpoints:** `POST /api/pagos/checkout`, `POST /api/pagos/webhook`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Pago simulado (MVP, issue #42)

Mientras no haya Stripe, el pago es **simulado** pero escribe en la BBDD con la forma de Stripe:

- `POST /api/pagos/checkout` (`usuario`) con `{ curso: slug }`: lee el precio de `curso.precio_centimos` (nunca del navegador), crea o reutiliza el `pedido` pendiente y devuelve una `checkout.session` ficticia (`cs_test_…`, guardado en `pedido.stripe_session_id`). Si ya tiene el curso, 409.
- `POST /api/pagos/confirmar` (`usuario`) con `{ sesion, metodo, tarjeta? }`: cualquier número, caducidad y CVC valen (no pueden ir vacíos) y **no se guardan**. Métodos: `tarjeta`, `paypal`, `bizum`, `cartera` y `gratis` (solo con importe 0). Devuelve un `payment_intent` ficticio con `status: "succeeded"`. El pedido de otro usuario responde 404.
- `confirmarPagoYMatricular()` es la función que reutilizará el webhook: marca el pedido como pagado y crea la matrícula `origen = 'compra'` en una transacción, idempotente. En el pago simulado enlaza la matrícula a la cuenta que paga.
- Pantalla: `/pago/[slug]` (pide sesión). Tipos compartidos en `src/lib/pagos.ts`.

Pasar a Stripe: `/api/pagos/checkout` crea la sesión real de Checkout y el webhook llama a `confirmarPagoYMatricular()`; `confirmar` desaparece.
