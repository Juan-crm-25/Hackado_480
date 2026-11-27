# recompensas

Puntos del foro: los de las respuestas se calculan de su validación (correcta +10, aproximada +5; no se guardan) y se suman a los que da el profesor (`punto_foro`). Insignias según su criterio (pendiente).

Premios del perfil (canje SIMULADO del MVP): el saldo son los puntos del foro más los movimientos de `movimiento_puntos`. Canjear un premio resta sus puntos (una vez por premio, en una transacción que bloquea al usuario para que dos canjes a la vez no gasten el mismo saldo); los botones «+100 puntos» y «+1000 puntos» los suman.

- **Tablas:** movimiento_puntos, insignia, usuario_insignia (lee comentario_foro y punto_foro)
- **Endpoints:** `GET /api/yo/puntos`, `GET /api/yo/premios`, `POST /api/yo/premios/canje`, `POST /api/yo/premios/demo`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
