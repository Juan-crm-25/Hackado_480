# compartido

Piezas comunes de la API: `ruta()` (sesión → acceso → validación Zod → servicio → JSON), respuestas, `ErrorApp` con su traducción a códigos HTTP y la caché compartida (`cache/`: memoria en local, Upstash Redis en Vercel).

- **Tablas:** ninguna
- **Endpoints:** ninguno propio; lo usan todos los `route.ts`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
