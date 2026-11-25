# auth

Better Auth (email y contraseña, Google) sobre Drizzle. `obtenerSesion()` y niveles de acceso globales (publico, usuario, alumno, profesor, admin). Los emails se guardan en minúsculas. Los permisos sobre un curso concreto NO van aquí: están en `matriculas`.

- **Tablas:** usuario, cuenta, sesion, verificacion
- **Endpoints:** `/api/auth/[...all]`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Uso

## Login simulado (MVP, issue #42)

Hasta conectar Better Auth, el login es **simulado** pero lee y escribe en la BBDD:

- **Endpoints:** `POST /api/auth/login` (email + contraseña), `POST /api/auth/registro` (nombre, email, contraseña de 8+ caracteres; siempre `rol = 'alumno'` y **sin verificar**, porque una matrícula solo se enlaza a un email verificado (docs/arquitectura.md, «Matrícula por email»)) y `POST /api/auth/logout`. Los tres son `publico`.
- **Contraseña:** hash scrypt en `cuenta.password_hash` (proveedor `credential`), con `cifrarContrasena()` / `comprobarContrasena()` de `src/lib/contrasena.ts`. Los usuarios del seed usan `CONTRASENA_DEMO` (`demo1234`).
- **Sesión:** una fila en `sesion` (7 días) y su token en la cookie httpOnly `hackado_sesion` (`cookie.ts`). El logout borra la fila y la cookie.
- **Páginas:** `src/proxy.ts` redirige a `/login?volver=…` si no hay cookie en `/dashboard`, `/modulos`, `/tutor` y `/perfil`; el layout `src/app/(app)/(privado)` valida la sesión con `requerirUsuarioActual()` (`usuario-actual.ts`).
- Google, Apple, GitHub y «¿Has olvidado tu contraseña?» son solo decoración en la pantalla de login.

Al conectar Better Auth se sustituye este módulo; `obtenerSesion()` mantiene su firma.

- `obtenerSesion(request)` (`sesion.ts`): `UsuarioSesion | null` a partir de la cookie de sesión. Sin cookie o con una sesión caducada, `null` (visitante).
- `obtenerUsuarioActual()` / `requerirUsuarioActual()` (`usuario-actual.ts`): lo mismo para las páginas (Server Components, dentro de `<Suspense>`).
- `cumpleAcceso(usuario, nivel)` (`roles.ts`) y los tipos `NivelAcceso`, `RolUsuario` (enum `rol_usuario` de la BBDD) y `UsuarioSesion`. Lo usa `ruta()`; no hace falta llamarlo desde los endpoints.
