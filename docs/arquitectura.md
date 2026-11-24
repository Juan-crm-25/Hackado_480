# Arquitectura de la API

> Referencia para personas **y para las IAs**. Antes de crear un endpoint, léelo. Reglas de datos: [`docs/bbdd/README.md`](bbdd/README.md). Reglas de tests: `AGENTS.md`.

---

## 1. Capas: quién hace qué

Cada petición atraviesa siempre las mismas capas, y cada una tiene **una sola responsabilidad**:

```
Petición HTTP
   │
   ▼
src/proxy.ts                  Solo comprobación OPTIMISTA: ¿hay cookie de sesión? Si no, redirige al login
   │                          en las PÁGINAS privadas. No consulta la BBDD ni decide permisos.
   ▼
src/app/api/**/route.ts       Adaptador HTTP, muy fino. Usa ruta(): sesión → rol → validar entrada → llamar
   │                          al servicio → responder JSON. Sin lógica de negocio ni consultas.
   ▼
src/server/<modulo>/servicio.ts      Casos de uso: reglas de negocio y permisos sobre el recurso
   │                                 (¿está matriculado en ESTE curso? ¿es el autor del tema?).
   ├──► src/server/<modulo>/repositorio.ts   Único sitio que consulta la BBDD (Drizzle, getDb()).
   └──► src/lib/agentes/*                    Agentes de IA (siempre a través del filtro de privacidad).
```

| Capa | Puede importar | No puede |
|---|---|---|
| `app/api/**/route.ts` | `server/compartido/http`, el `servicio` y los `esquemas` de su módulo | Consultar la BBDD, llamar a la IA, contener reglas de negocio |
| `server/<modulo>/servicio.ts` | Su `repositorio`, servicios de otros módulos, `lib/agentes`, `server/compartido` | Leer la petición HTTP, devolver `Response` |
| `server/<modulo>/repositorio.ts` | `lib/db` (`getDb`, esquema) | Llamar a la IA, conocer HTTP, decidir permisos |
| `lib/agentes`, `lib/ai` | `lib/ai/privacidad` | Escribir en la BBDD (ver reglas de datos) |

Todos los ficheros de `src/server/` empiezan con `import "server-only"`: si alguien los importa desde el navegador, el build falla.

---

## 2. Estructura de carpetas

```
src/
  proxy.ts                      Comprobación optimista de sesión (antes «middleware» en Next < 16)
  app/
    api/                        Route Handlers: solo adaptadores HTTP (sección 4)
    (paginas)…                  Pantallas de la PWA
  server/                       Lógica del servidor, organizada POR DOMINIO
    compartido/
      http/                     ruta(), respuestas JSON y traducción de errores a códigos HTTP
      errores.ts                ErrorApp y sus códigos (no autenticado, prohibido, no encontrado…)
    auth/                       Better Auth (configuración) y sesión: obtenerSesion(), roles
    usuarios/                   Perfil propio y gestión de usuarios (admin)
    catalogo/                   Categorías, cursos, módulos, clases, documentos e imágenes (R2)
    matriculas/                 Acceso a cursos por email, invitaciones y ruta personal
    pagos/                      Stripe Checkout y webhook
    aprendizaje/                Ejercicios, intentos y progreso
    evaluaciones/               Diagnóstico, tests y exámenes
    material/                   Material de cada clase (se genera una vez) y material personal
    tutor/                      Conversaciones con el tutor IA y límite diario
    foro/                       Temas, comentarios y validación de respuestas (IA o profesor)
    recompensas/                Puntos (calculados) e insignias
    radar/                      Informe para el profesor
  lib/                          Infraestructura técnica compartida (ya existe)
    db/                         Esquema Drizzle y getDb()
    ai/                         Cliente de IA, filtro de privacidad y límite
    agentes/                    Agentes de IA (tutor, material, infografía…; aquí irá el validador del foro)
    types.ts                    Contrato de la API con el frontend
```

Cada módulo de `src/server/<modulo>/` sigue el mismo patrón:

| Fichero | Contenido |
|---|---|
| `servicio.ts` | Casos de uso del módulo (funciones exportadas) |
| `repositorio.ts` | Consultas Drizzle del módulo |
| `esquemas.ts` | Validación con **Zod** de lo que entra por la API (cuerpo, query, params) |
| `servicio.test.ts` | Tests de los casos de uso (obligatorios, ver `AGENTS.md`) |

Se crean los ficheros cuando hacen falta, no antes. El `README.md` de cada carpeta dice qué tablas y endpoints le corresponden.

**Los endpoints que ya existen** (`/api/catalogo`, `/api/tutor`, `/api/intentos`…) siguen funcionando como están. Se pasan a esta estructura cuando se toquen para leer de la BBDD, uno por PR, sin romper el contrato de `types.ts`.

---

## 3. Autenticación y permisos

### Niveles de acceso

| Nivel | Quién | Cómo se comprueba |
|---|---|---|
| `publico` | Cualquiera, también el **visitante** (sin sesión) | No se comprueba nada |
| `usuario` | Cualquiera con sesión | Hay sesión válida (Better Auth) |
| `alumno` · `profesor` · `admin` | Por `usuario.rol`. Jerarquía: **admin ⊃ profesor ⊃ alumno** | Rol global ≥ el pedido |
| Acceso al curso | Matriculado en ESE curso (`matricula`), o profesor del curso, o admin | En el **servicio**, con `requerirAccesoCurso()` |

Dos comprobaciones distintas, en dos sitios distintos:

1. **¿Quién eres y qué rol tienes?** → en `ruta()`, antes de entrar al servicio. Sin sesión: **401**. Rol insuficiente: **403**.
2. **¿Puedes tocar ESTE recurso?** (tu matrícula, tu tema del foro, tu pedido) → en el **servicio**, porque necesita datos. Si no: **403** (o **404** si no debe saberse que existe).

`proxy.ts` **no es una de esas comprobaciones**: solo evita enseñar páginas privadas a quien no tiene cookie. La seguridad real está en `ruta()` y en los servicios (lo recomienda la guía de autenticación de Next.js 16).

### Cómo se escribe un endpoint

```ts
// src/app/api/clases/[id]/temas/route.ts
import { ruta } from "@/server/compartido/http/ruta";
import { crearTema } from "@/server/foro/servicio";
import { esquemaCrearTema } from "@/server/foro/esquemas";

export const POST = ruta({ acceso: "alumno", cuerpo: esquemaCrearTema }, ({ usuario, params, cuerpo }) =>
  crearTema(usuario, params.id, cuerpo),
);
```

`ruta()` se encarga, en este orden, de: leer la sesión → comprobar el nivel de acceso → validar `params`, `query` y `cuerpo` con Zod → llamar a la función → devolver JSON → traducir cualquier `ErrorApp` a su código HTTP.

### Errores

Todas las respuestas de error tienen la misma forma (amplía `ErrorApi` de `types.ts`):

```json
{ "error": "Mensaje legible", "codigo": "PROHIBIDO", "detalles": {} }
```

| `codigo` | HTTP | Cuándo |
|---|---|---|
| `NO_AUTENTICADO` | 401 | No hay sesión |
| `PROHIBIDO` | 403 | Rol insuficiente o el recurso no es suyo |
| `NO_ENCONTRADO` | 404 | No existe (o no debe saberse que existe) |
| `DATOS_INVALIDOS` | 400 | Zod rechaza la entrada (`detalles` lleva los campos) |
| `CONFLICTO` | 409 | Ya existe (por ejemplo, matrícula repetida) |
| `LIMITE_SUPERADO` | 429 | Límite diario de IA agotado |
| `ERROR_IA` | 502 | La IA no responde o devuelve algo inválido |

---

## 4. Mapa de endpoints

Estado: ✅ existe · 🔁 existe, se migrará a la BBDD y a esta estructura · ⬜ pendiente.

| Método y ruta | Acceso | Módulo | Estado |
|---|---|---|---|
| `GET/POST /api/auth/[...all]` | publico | auth (Better Auth: registro, login, Google, logout, sesión) | ⬜ |
| `GET /api/yo` | usuario | usuarios (perfil, rol, puntos e insignias) | ⬜ |
| `PATCH /api/yo` | usuario | usuarios | ⬜ |
| `GET /api/usuarios` · `PATCH /api/usuarios/:id/rol` | admin | usuarios | ⬜ |
| `GET /api/categorias` | publico | catalogo | ⬜ |
| `GET /api/cursos?categoria=` | publico | catalogo | ⬜ |
| `GET /api/cursos/:slug` | publico | catalogo (ficha: módulos, imágenes, precio) | ⬜ |
| `POST /api/cursos` · `PATCH /api/cursos/:id` | profesor | catalogo | ⬜ |
| `POST /api/cursos/:id/imagenes` | profesor | catalogo (URL firmada de R2 para subir) | ⬜ |
| `GET /api/catalogo` | publico | catalogo | 🔁 |
| `GET /api/modulos/:id` | acceso al curso | catalogo | 🔁 |
| `GET /api/clases/:id` | acceso al curso | catalogo (vídeo y documentos) | ⬜ |
| `GET /api/yo/cursos` | usuario | matriculas (mis cursos y mi ruta) | ⬜ |
| `POST /api/cursos/:id/invitaciones` | profesor | matriculas (da acceso a un email) | ⬜ |
| `GET /api/cursos/:id/diagnostico` | alumno | evaluaciones | ⬜ |
| `POST /api/cursos/:id/diagnostico/intentos` | alumno | evaluaciones → matriculas (fija la ruta personal) | ⬜ |
| `GET /api/evaluaciones/:id` · `POST /api/evaluaciones/:id/intentos` | acceso al curso | evaluaciones | ⬜ |
| `GET /api/modulos/:id/ejercicios` | acceso al curso | aprendizaje | 🔁 |
| `POST /api/intentos` | alumno | aprendizaje | 🔁 |
| `GET /api/progreso` | alumno | aprendizaje (del usuario de la sesión, sin `alumnoId`) | 🔁 |
| `GET /api/clases/:id/material/:tipo` | acceso al curso | material (se genera la primera vez) | ⬜ |
| `GET /api/modulos/:id/material` · `/infografias` | acceso al curso | material | 🔁 |
| `GET/POST /api/material-personal` | alumno | material | 🔁 |
| `POST /api/tutor` | acceso al curso | tutor | 🔁 |
| `GET/POST /api/clases/:id/temas` | acceso al curso | foro | ⬜ |
| `GET /api/temas/:id` · `POST /api/temas/:id/comentarios` | acceso al curso | foro | ⬜ |
| `POST /api/comentarios/:id/validacion` | profesor | foro (el profesor marca buena / no útil; prevalece sobre la IA) | ⬜ |
| `GET /api/yo/recompensas` · `GET /api/insignias` | usuario · publico | recompensas | ⬜ |
| `POST /api/pagos/checkout` | usuario | pagos (crea el pedido y la sesión de Stripe) | ⬜ |
| `POST /api/pagos/webhook` | **firma de Stripe** (sin sesión) | pagos (marca pagado y crea la matrícula) | ⬜ |
| `GET /api/radar` | profesor | radar | 🔁 |

**La validación del foro por IA no es un endpoint:** cuando se crea un comentario, el servicio del foro llama al agente validador (`lib/agentes`) **después** de responder al alumno, y guarda el resultado con `validado_por = 'ia'`. Si la IA falla, el comentario se queda `pendiente`, sin romper nada.

---

## 5. Orden de implementación

Cada paso es una PR con sus tests (TDD), y desbloquea los siguientes:

1. **Base compartida:** `ErrorApp`, `ruta()` y respuestas JSON. Instala `zod` y `server-only` como dependencias directas.
2. **Auth:** Better Auth con Drizzle, `/api/auth/[...all]`, `obtenerSesion()`, niveles de acceso y `proxy.ts`. Usuarios de demo en el seed.
3. **Catálogo** desde la BBDD (con el seed que importa `catalog.json` y las transcripciones a markdown).
4. **Matrículas** y `requerirAccesoCurso()`.
5. El resto por prioridad de la demo: aprendizaje → material → tutor → evaluaciones (diagnóstico) → pagos → foro y recompensas → radar.
