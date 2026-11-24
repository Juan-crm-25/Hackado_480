# pagos

Compra simulada con Stripe en modo test: crea el pedido y la sesión de Checkout; el webhook comprueba la firma, marca el pedido como pagado y crea la matrícula.

- **Tablas:** pedido (y matricula a través de matriculas)
- **Endpoints:** `POST /api/pagos/checkout`, `POST /api/pagos/webhook`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
