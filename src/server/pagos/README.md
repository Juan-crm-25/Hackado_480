# pagos

Compra simulada con Stripe en modo test: crea el pedido y la sesión de Checkout. El webhook lee el cuerpo en bruto, comprueba la firma y es idempotente: marca el pedido como pagado y crea la matrícula en una sola transacción, solo si el pago está hecho y el importe cuadra (ver docs/arquitectura.md, «Webhook de Stripe»).

- **Tablas:** pedido (y matricula a través de matriculas)
- **Endpoints:** `POST /api/pagos/checkout`, `POST /api/pagos/webhook`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
