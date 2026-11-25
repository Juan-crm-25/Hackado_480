# matriculas

Acceso a cursos por email (invitación o compra) y ruta personal del alumno (`modulo_principal_id`, `orden_modulos`). Aquí viven `requerirAccesoCurso()` y `requerirProfesorDelCurso()`. Una matrícula solo se enlaza a un usuario con el email verificado. La matrícula por compra solo la crea el módulo de pagos desde el webhook.

- **Tablas:** matricula
- **Endpoints:** `GET /api/yo/cursos`, `POST /api/cursos/:id/invitaciones`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Uso

- `cargarCursosDelUsuario(usuarioId)` (`servicio.ts`): «Tus cursos», los cursos con matrícula enlazada al usuario, por título, con `porcentaje` de módulos `dominado`/`completado` (`porcentajeCompletado()` de `src/lib/progreso.ts`). Nunca lanza: `ok`, `vacio` o `error`.
- `tieneElCurso(usuarioId, slug)`: para elegir entre «Inscribirme» e «Ir a tu curso». Sin BBDD, `false`.
