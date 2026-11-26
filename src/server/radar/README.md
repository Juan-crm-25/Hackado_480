# radar

Radar del tutor (#5): a quién ayudar, qué conceptos se fallan y qué se pregunta al tutor IA. Lo ve el **profesor de ese curso** (o un admin); a la IA nunca le llegan nombres.

- **Tablas:** lee `matricula`, `intento`, `ejercicio`, `concepto`, `modulo`, `conversacion` y `mensaje`.
- **Endpoint:** `GET /api/radar?curso=<slug>` (ruta() exige rol profesor; el servicio, que dé ESE curso con `requerirProfesorDelCurso()`).
- **Pantalla:** `/radar` (en la navegación, solo para profesores y admin).
- **`calculo.ts`:** las reglas, solo código y sin IA (predecible y explicable):
  - **Atascado:** 3 fallos seguidos o más en un concepto, el último en los últimos 7 días.
  - **Inactivo:** había empezado y lleva más de 7 días sin intentos ni preguntas al tutor.
  - **Conceptos más fallados:** % de fallo de los últimos 30 días, con al menos 5 intentos.
  - **Dudas frecuentes:** preguntas al tutor de las 2 últimas semanas, por módulo (ya filtradas).
- **`repositorio.ts`:** lee esos datos de un curso. **`servicio.ts`:** permisos + cálculo.
- **Resumen con IA** (`obtenerResumenDudas()`, `GET /api/radar/resumen`): el agente analista (`agents/analista-radar.md`) resume las dudas de las 2 últimas semanas. Solo le llegan los textos (ya filtrados) agrupados por módulo y los conceptos más fallados, nunca quién preguntó. Caché de 1 hora por curso que se invalida si hay preguntas nuevas.
- Pendiente: responder dudas pasadas a un tutor humano (H9).

Para la demo: `npm run db:seed:actividad` crea actividad simulada (ver docs/bbdd/README.md).

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
