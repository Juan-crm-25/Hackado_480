# matriculas

Acceso a cursos por email (invitación o compra) y ruta personal del alumno (`modulo_principal_id`, `orden_modulos`). Aquí viven `requerirAccesoCurso()` y `requerirProfesorDelCurso()`. Una matrícula solo se enlaza a un usuario con el email verificado. La matrícula por compra solo la crea el módulo de pagos desde el webhook.

- **Tablas:** matricula
- **Endpoints:** `GET /api/yo/cursos`, `POST /api/cursos/:id/invitaciones`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Uso

- `cargarCursosDelUsuario(usuarioId)` (`servicio.ts`): «Tus cursos», los cursos con matrícula enlazada al usuario, por título, con `porcentaje` de módulos `dominado`/`completado` (`porcentajeCompletado()` de `src/lib/progreso.ts`). Nunca lanza: `ok`, `vacio` o `error`.
- `tieneElCurso(usuarioId, slug)`: para elegir entre «Inscribirme» e «Ir a tu curso». Sin BBDD, `false`.
- **Ruta personalizada** (cursos no lineales): `obtenerRuta(usuario, slug)` y `guardarRuta(usuario, slug, { valoraciones })`, expuestas en `GET/PUT /api/cursos/:slug/ruta`. El alumno valora cada módulo («Me interesa mucho», «Me interesa», «Ya lo sé») y las reglas de `src/lib/ruta.ts` lo ordenan (sin IA). Se guarda `matricula.orden_modulos` y `modulo_principal_id`. «Ya lo sé» solo manda el módulo al final: el `dominado` llega únicamente al aprobar el test del módulo. Las valoraciones no se guardan. 404 si el curso no existe y 403 si no lo tiene.
- `cargarAvanceDelCurso(usuarioId, slug)`: la ruta y el progreso del alumno para el panel. Nunca lanza.

