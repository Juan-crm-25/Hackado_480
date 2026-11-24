# matriculas

Acceso a cursos por email (invitación o compra) y ruta personal del alumno (`modulo_principal_id`, `orden_modulos`). Aquí viven `requerirAccesoCurso()` y `requerirProfesorDelCurso()`. Una matrícula solo se enlaza a un usuario con el email verificado. La matrícula por compra solo la crea el módulo de pagos desde el webhook.

- **Tablas:** matricula
- **Endpoints:** `GET /api/yo/cursos`, `POST /api/cursos/:id/invitaciones`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
