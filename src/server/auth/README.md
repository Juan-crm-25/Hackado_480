# auth

Better Auth (email y contraseña, Google) sobre Drizzle. `obtenerSesion()` y niveles de acceso globales (publico, usuario, alumno, profesor, admin). Los emails se guardan en minúsculas. Los permisos sobre un curso concreto NO van aquí: están en `matriculas`.

- **Tablas:** usuario, cuenta, sesion, verificacion
- **Endpoints:** `/api/auth/[...all]`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Uso

- `obtenerSesion(request)` (`sesion.ts`): `UsuarioSesion | null`. Hasta el paso 2 (Better Auth) siempre devuelve `null`: todos son visitantes.
- `cumpleAcceso(usuario, nivel)` (`roles.ts`) y los tipos `NivelAcceso`, `RolUsuario` (enum `rol_usuario` de la BBDD) y `UsuarioSesion`. Lo usa `ruta()`; no hace falta llamarlo desde los endpoints.
