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
| Acceso al curso | Matriculado en ESE curso (`matricula`), o profesor de ese curso, o admin | En el **servicio**, con `requerirAccesoCurso()` |
| Profesor del curso | Matriculado en ESE curso con `rol_en_curso = 'profesor'`, o admin | En el **servicio**, con `requerirProfesorDelCurso()` |

Dos comprobaciones distintas, en dos sitios distintos:

1. **¿Quién eres y qué rol tienes?** → en `ruta()`, antes de entrar al servicio. Sin sesión: **401**. Rol insuficiente: **403**.
2. **¿Puedes tocar ESTE recurso?** (tu matrícula, tu tema del foro, tu pedido, **el curso que enseñas**) → en el **servicio**, porque necesita datos. Si no: **403** (o **404** si no debe saberse que existe).

**Ser profesor no da acceso a todos los cursos.** Un endpoint de profesor comprueba el rol global en `ruta()` y, además, en el servicio, que es profesor de ESE curso. Si no, un profesor podría editar, invitar, moderar o ver el Radar (con datos de alumnos) de cursos ajenos. Al crear un curso, quien lo crea queda matriculado en él como profesor. **El admin sí puede tocar todos los cursos:** `requerirAccesoCurso()` y `requerirProfesorDelCurso()` lo dejan pasar siempre, sin necesidad de matrícula.

`requerirAccesoCurso()` y `requerirProfesorDelCurso()` viven en el módulo **`matriculas`**, porque leen la tabla `matricula`. El módulo `auth` solo da la sesión y el rol global.

### Matrícula por email: solo con el email verificado

El acceso se da a un email (invitación o compra). Para que nadie se registre con el email de otra persona y se quede su acceso, **una matrícula solo se enlaza a un usuario si `usuario.email_verificado = true`**:

- **Google** ya entrega el email verificado.
- **Email y contraseña:** Better Auth envía un enlace de confirmación. En el MVP no hay servicio de correo, así que los usuarios de demo se crean ya verificados en el seed y los nuevos usan Google. El envío real de correos (por ejemplo, con Resend) es una mejora posterior que no cambia este diseño.

`proxy.ts` **no es una de esas comprobaciones**: solo evita enseñar páginas privadas a quien no tiene cookie. La seguridad real está en `ruta()` y en los servicios (lo recomienda la guía de autenticación de Next.js 16).

### Cómo se escribe un endpoint

```ts
// src/app/api/clases/[id]/temas/route.ts
import { ruta } from "@/server/compartido/http/ruta";
import { crearTema } from "@/server/foro/servicio";
import { esquemaCrearTema } from "@/server/foro/esquemas";

// ruta() comprueba la sesión; crearTema() comprueba con requerirAccesoCurso() que el usuario
// tiene acceso al curso de esa clase (matriculado, profesor del curso o admin).
export const POST = ruta({ acceso: "usuario", cuerpo: esquemaCrearTema }, ({ usuario, params, cuerpo }) =>
  crearTema(usuario, params.id, cuerpo),
);
```

En el mapa de endpoints, **«acceso al curso»** y **«profesor del curso»** significan siempre las dos cosas: un nivel en `ruta()` (`usuario` o `profesor`) más la comprobación del curso en el servicio.

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
| `POST /api/cursos` | profesor | catalogo (quien lo crea queda como profesor del curso) | ⬜ |
| `PATCH /api/cursos/:id` | profesor del curso | catalogo | ⬜ |
| `POST /api/cursos/:id/imagenes` | profesor del curso | catalogo (URL firmada de R2: solo JPEG, PNG o WebP, máx. 2 MB, nombre del fichero lo decide el servidor) | ⬜ |
| `GET /api/catalogo` | publico | catalogo | 🔁 |
| `GET /api/modulos/:id` | acceso al curso | catalogo | 🔁 |
| `GET /api/clases/:id` | acceso al curso | catalogo (vídeo y documentos) | ⬜ |
| `GET /api/yo/cursos` | usuario | matriculas (mis cursos y mi ruta) | ⬜ |
| `POST /api/cursos/:id/invitaciones` | profesor del curso | matriculas (da acceso a un email) | ⬜ |
| `GET /api/cursos/:id/diagnostico` | alumno | evaluaciones | ⬜ |
| `POST /api/cursos/:id/diagnostico/intentos` | alumno | evaluaciones → matriculas (fija la ruta personal) | ⬜ |
| `GET /api/evaluaciones/:id` · `POST /api/evaluaciones/:id/intentos` | acceso al curso | evaluaciones | ⬜ |
| `GET /api/modulos/:id/ejercicios` | acceso al curso | aprendizaje | 🔁 |
| `POST /api/intentos` | alumno | aprendizaje | 🔁 |
| `GET /api/progreso` | alumno | aprendizaje (del usuario de la sesión, sin `alumnoId`) | 🔁 |
| `GET /api/clases/:id/material/:tipo` | acceso al curso | material (se genera la primera vez; como es único por clase y tipo, el coste de IA está acotado) | ⬜ |
| `GET /api/modulos/:id/material` · `/infografias` | acceso al curso | material | 🔁 |
| `GET/POST /api/material-personal` | alumno | material | 🔁 |
| `POST /api/tutor` | acceso al curso | tutor | 🔁 |
| `GET/POST /api/clases/:id/temas` | acceso al curso | foro | ⬜ |
| `GET /api/temas/:id` · `POST /api/temas/:id/comentarios` | acceso al curso | foro | ⬜ |
| `POST /api/comentarios/:id/validacion` | profesor del curso | foro (el profesor marca buena / no útil; prevalece sobre la IA) | ⬜ |
| `GET /api/yo/recompensas` · `GET /api/insignias` | usuario · publico | recompensas | ⬜ |
| `POST /api/pagos/checkout` | usuario | pagos (crea el pedido y la sesión de Stripe) | ⬜ |
| `POST /api/pagos/webhook` | **firma de Stripe** (sin sesión) | pagos (marca pagado y crea la matrícula, ver abajo) | ⬜ |
| `GET /api/radar?cursoId=` | profesor del curso | radar (solo datos de los cursos que enseña) | 🔁 |

### Validación del foro por IA

No es un endpoint. Cuando se crea un comentario:

1. El servicio guarda el comentario (`pendiente`) y **responde al alumno sin esperar a la IA**.
2. Con **`after()`** de Next.js (`import { after } from "next/server"`) programa la validación. En Vercel, `after()` mantiene viva la función hasta que termina (usa `waitUntil`), así que no se corta al enviar la respuesta. Se limita con `export const maxDuration = 30` en el `route.ts`.
3. El agente validador (`lib/agentes`, con el texto filtrado) devuelve `buena` o `no_util`. Se guarda con `validado_por = 'ia'` **solo si sigue `pendiente`**, para no pisar una decisión del profesor.
4. **Si la IA falla**, el comentario se queda `pendiente` y el error se registra con `console.error` (aparece en los logs de Vercel). **Reintento sin cron:** al abrir un tema, sus comentarios `pendiente` de hace más de 10 minutos se vuelven a validar con `after()`.

### Webhook de Stripe

Stripe puede enviar el mismo aviso varias veces, así que el webhook tiene que ser **idempotente**:

1. Leer el cuerpo **en bruto** (`await request.text()`) y comprobar la firma con `STRIPE_WEBHOOK_SECRET`. Si no es válida: **400**.
2. Atender solo el evento `checkout.session.completed`. Los demás: **200** sin hacer nada.
3. **En una sola transacción:** `UPDATE pedido SET estado = 'pagado' … WHERE stripe_session_id = ? AND estado = 'pendiente'`. Si no cambia ninguna fila, el aviso ya se procesó: **200** sin hacer nada. Si cambia, crear la matrícula (`origen = 'compra'`) con `ON CONFLICT (curso_id, email) DO NOTHING` (si ya estaba invitado, ya tiene acceso).
4. Responder **200** también en los repetidos. Solo un error real (la BBDD no responde) devuelve **500**, para que Stripe lo reintente. Como todo va en una transacción, nunca queda un pedido pagado sin matrícula.

---

## 5. Caché

Los vídeos están en YouTube y no pasan por nuestro servidor. Lo que cuesta dinero y tiempo al crecer es **la IA** y las **lecturas repetidas**. Por eso hay varias capas, de la más cercana al alumno a la más lejana:

| Capa | Qué guarda | Cómo |
|---|---|---|
| Service worker (PWA) | La interfaz y el material ya visto, en el móvil | Caché del navegador |
| CDN de Vercel | Respuestas públicas (catálogo, ficha del curso) | Cabecera `Cache-Control: public, s-maxage=…` en esos `GET` |
| `use cache` de Next.js 16 | Resultado de funciones del servidor que leen datos públicos | Ya activado (`cacheComponents: true`); cada uso con su `cacheLife` |
| **Caché compartida (Redis)** | **Respuestas del tutor a preguntas repetidas** | Interfaz `Cache` (abajo) |
| PostgreSQL | Material generado una vez y reutilizado | `material_clase`, ya en el esquema |

### La caché compartida

Las funciones de Vercel no comparten memoria, así que la caché que comparten todos los alumnos va en **Redis**, a través de **Upstash** (serverless, por HTTP, con plan gratuito y región en la UE). Para no atar el código a Upstash ni necesitarlo en local:

```
src/server/compartido/cache/
  cache.ts      Interfaz: obtener(clave), guardar(clave, valor, segundos)
  memoria.ts    Implementación en memoria: local y tests (sin instalar nada)
  upstash.ts    Implementación con @upstash/redis
  index.ts      getCache(): Upstash si existen sus variables de entorno; si no, memoria
```

- **Uso en el tutor:** antes de llamar a la IA, se busca la clave; si está (**HIT**), se responde sin IA y sin gastar consulta del límite diario; si no (**MISS**), se llama a la IA y se guarda la respuesta 7 días. La respuesta lleva la cabecera **`X-Cache: HIT | MISS`**, que se enseña en la demo junto al tiempo de respuesta.
- **Clave:** `tutor:<moduloId>:<hash>`, donde el hash se calcula sobre la pregunta **ya filtrada** (sin datos personales) y normalizada (minúsculas, sin espacios repetidos ni signos finales). Solo se usa caché en preguntas sin historial de conversación, porque con historial la respuesta depende del contexto.
- **Privacidad:** en la caché solo hay texto del curso y preguntas filtradas, nunca datos del alumno.
- **Si Redis falla**, se trata como un MISS: la app sigue funcionando, solo que sin caché.

**Desplegarlo en Vercel:** *Storage → Marketplace → Upstash Redis → Create*, región de la UE y plan gratuito. Vercel añade solas las variables `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`, y `getCache()` las detecta. No hay servidor que mantener.

---

## 6. Orden de implementación

Cada paso es una PR con sus tests (TDD), y desbloquea los siguientes:

1. **Base compartida:** `ErrorApp`, `ruta()` y respuestas JSON. Instala `zod` y `server-only` como dependencias directas.
2. **Auth:** Better Auth con Drizzle, `/api/auth/[...all]`, `obtenerSesion()`, niveles de acceso y `proxy.ts`. Usuarios de demo de cada rol, ya verificados, en el seed.
3. **Catálogo** desde la BBDD (con el seed que importa `catalog.json` y las transcripciones a markdown).
4. **Matrículas**, `requerirAccesoCurso()` y `requerirProfesorDelCurso()`.
5. El resto por prioridad de la demo: aprendizaje → material → tutor → evaluaciones (diagnóstico) → pagos → foro y recompensas → radar.
6. **Caché compartida** (interfaz, memoria y Upstash) aplicada al tutor. Se hace después de que el tutor lea de la BBDD; si falta tiempo, es lo primero que se recorta.
