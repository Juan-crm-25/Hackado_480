# auth

Better Auth (email y contraseña, Google) sobre Drizzle. `obtenerSesion()`, niveles de acceso (publico, usuario, alumno, profesor, admin) y `requerirAccesoCurso()`. Los emails se guardan en minúsculas.

- **Tablas:** usuario, cuenta, sesion, verificacion
- **Endpoints:** `/api/auth/[...all]`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
