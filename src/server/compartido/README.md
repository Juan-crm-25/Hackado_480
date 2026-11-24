# compartido

Piezas comunes de la API: `ruta()` (sesión → acceso → validación Zod → servicio → JSON), respuestas, `ErrorApp` con su traducción a códigos HTTP y la caché compartida (`cache/`: memoria en local, Upstash Redis en Vercel).

- **Tablas:** ninguna
- **Endpoints:** ninguno propio; lo usan todos los `route.ts`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Uso

- `ruta(opciones, manejador)` desde `@/server/compartido/http`: `opciones = { acceso, params?, query?, cuerpo? }` (esquemas Zod). El manejador recibe `{ usuario, params, query, cuerpo, request }` ya validados; `usuario` solo es `null` con `acceso: "publico"`, y `params`/`query`/`cuerpo` son `undefined` si no se declara su esquema. Si devuelve una `Response` se envía tal cual; si no, se responde JSON (204 si devuelve `undefined`).
- `crearRuta({ obtenerSesion })`: la misma `ruta()` con la sesión inyectada, para los tests.
- Errores (`errores.ts`): `ErrorApp(codigo, mensaje, detalles?)`, `STATUS_POR_CODIGO`, `CodigoError` y las fábricas `noAutenticado()`, `prohibido()`, `noEncontrado()`, `datosInvalidos(detalles)`, `conflicto()`, `limiteSuperado()`, `errorIa()`.
- Respuestas (`http/respuestas.ts`): `respuestaJson(datos, status)`, `respuestaError(error)` y el tipo `RespuestaError`. Un error que no es `ErrorApp` responde 500 `ERROR_INTERNO` sin enseñar su mensaje.
