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
import { ruta } from "@/server/compartido/http";
import { crearTema } from "@/server/foro/servicio";
import { esquemaCrearTema, esquemaParamsClase } from "@/server/foro/esquemas";

// ruta() comprueba la sesión; crearTema() comprueba con requerirAccesoCurso() que el usuario
// tiene acceso al curso de esa clase (matriculado, profesor del curso o admin).
// params, query y cuerpo solo existen si se declara su esquema (si no, llegan como undefined).
export const POST = ruta(
  { acceso: "usuario", params: esquemaParamsClase, cuerpo: esquemaCrearTema },
  ({ usuario, params, cuerpo }) => crearTema(usuario, params.id, cuerpo),
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
| `POST /api/auth/login`, `/registro`, `/logout` | publico | auth (login simulado del MVP, ver `src/server/auth/README.md`) | ✅ |
| `POST /api/pagos/checkout`, `/confirmar` | usuario | pagos (pago simulado del MVP, ver `src/server/pagos/README.md`) | ✅ |
| `GET/PUT /api/cursos/:slug/ruta` | usuario (con el curso) | matriculas (ruta personalizada: valorar módulos y reordenar) | ✅ |
| `GET /api/yo` | usuario | usuarios (perfil, rol, puntos e insignias) | ⬜ |
| `PATCH /api/yo` | usuario | usuarios | ⬜ |
| `GET /api/usuarios` · `PATCH /api/usuarios/:id/rol` | admin | usuarios | ⬜ |
| `GET /api/categorias` | publico | catalogo | ⬜ |
| `GET /api/cursos?categoria=` | publico | catalogo | ⬜ |
| `GET /api/cursos/:slug` | publico | catalogo (ficha: módulos, imágenes, precio) | ⬜ |
| `POST /api/cursos` | profesor | catalogo (quien lo crea queda como profesor del curso) | ⬜ |
| `PATCH /api/cursos/:id` | profesor del curso | catalogo | ⬜ |
| `POST /api/cursos/:id/imagenes` | profesor del curso | catalogo (subida a R2 en dos pasos, ver abajo) | ⬜ |
| `POST /api/cursos/:id/imagenes/confirmar` | profesor del curso | catalogo (comprueba lo subido y guarda la URL) | ⬜ |
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
| `POST /api/tutor` | acceso al curso (`requerirAccesoCurso()`) | tutor | ✅ |
| `GET/POST /api/clases/:id/temas` | acceso al curso | foro | ⬜ |
| `GET /api/temas/:id` · `POST /api/temas/:id/comentarios` | acceso al curso | foro | ⬜ |
| `POST /api/comentarios/:id/validacion` | profesor del curso | foro (el profesor marca buena / no útil; prevalece sobre la IA) | ⬜ |
| `GET /api/yo/recompensas` · `GET /api/insignias` | usuario · publico | recompensas | ⬜ |
| `POST /api/pagos/checkout` | usuario | pagos (crea el pedido y la sesión de Stripe) | ⬜ |
| `POST /api/pagos/webhook` | **firma de Stripe** (sin sesión) | pagos (marca pagado y crea la matrícula, ver abajo) | ⬜ |
| `GET /api/radar?curso=<slug>` | profesor del curso | radar (solo datos de los cursos que enseña; `requerirProfesorDelCurso()`) | ✅ |
| `GET /api/radar/resumen?curso=<slug>` | profesor del curso | radar (agente analista) | ✅ |
| `GET /api/radar/dudas?curso=<slug>` | profesor del curso | tutor (H9: dudas pasadas a un tutor humano) | ✅ |
| `POST /api/radar/dudas/[id]/respuesta` | profesor del curso | tutor (H9: el profesor responde, sin IA) | ✅ |
| `POST /api/tutor/humano` · `GET /api/tutor/humano?modulo=<slug>` | usuario (solo sus preguntas) | tutor (H9) | ✅ |

### Validación del foro por IA

No es un endpoint. Cuando se crea un comentario:

1. El servicio guarda el comentario (`pendiente`) y **responde al alumno sin esperar a la IA**.
2. Con **`after()`** de Next.js (`import { after } from "next/server"`) programa la validación. En Vercel, `after()` mantiene viva la función hasta que termina (usa `waitUntil`), así que no se corta al enviar la respuesta. Se limita con `export const maxDuration = 30` en el `route.ts`.
3. El agente validador (`lib/agentes`, con el texto filtrado) devuelve `buena` o `no_util`. Se guarda con `validado_por = 'ia'` **solo si sigue `pendiente`**, para no pisar una decisión del profesor.
4. **Si la IA falla**, el comentario se queda `pendiente` y el error se registra con `console.error` (aparece en los logs de Vercel). **Reintento sin cron, con freno:** al abrir un tema, se vuelven a validar con `after()` sus comentarios `pendiente` de hace más de 10 minutos, pero:
   - **Como mucho una vez cada 10 minutos por tema**, aunque lo abran muchas personas: se guarda la marca `foro:reintento:<temaId>` en la caché compartida (sección 5) con 10 minutos de vida. Si ya existe, no se reintenta. Así, si la IA está caída, las visitas no multiplican las llamadas.
   - **Como mucho 5 comentarios por reintento**, los más antiguos primero.
   - El `route.ts` del tema también lleva `export const maxDuration = 30`, porque ejecuta `after()`.

### Webhook de Stripe

Stripe puede enviar el mismo aviso varias veces, así que el webhook tiene que ser **idempotente**:

1. Leer el cuerpo **en bruto** (`await request.text()`) y comprobar la firma con `STRIPE_WEBHOOK_SECRET`. Si no es válida: **400**.
2. Atender solo `checkout.session.completed` y `checkout.session.async_payment_succeeded` (pagos diferidos). Los demás: **200** sin hacer nada.
3. **Comprobar que el pago está hecho y cuadra**, porque `completed` puede llegar antes de cobrar con métodos de pago diferidos:
   - `session.payment_status === "paid"`. Si no, **200** sin dar acceso: ya llegará `async_payment_succeeded`.
   - `session.amount_total` y `session.currency` iguales a `pedido.importe_centimos` y `pedido.moneda`. Si no cuadran, `console.error` y **200** sin dar acceso (no se reintenta, porque reintentarlo no lo arreglaría).
4. **En una sola transacción:** `UPDATE pedido SET estado = 'pagado' … WHERE stripe_session_id = ? AND estado = 'pendiente'`. Si no cambia ninguna fila, el aviso ya se procesó: **200** sin hacer nada. Si cambia, crear la matrícula (`origen = 'compra'`) con `ON CONFLICT (curso_id, email) DO NOTHING`. Si ya estaba invitado, ya tiene acceso: su matrícula se queda como estaba (`origen = 'invitacion'`) y el pedido pagado queda registrado en `pedido`, sin enlazar a la matrícula.
5. Responder **200** también en los repetidos. Solo un error real (la BBDD no responde) devuelve **500**, para que Stripe lo reintente. Como todo va en una transacción, nunca queda un pedido pagado sin matrícula.

### Subida de imágenes a R2

El navegador sube la imagen **directamente a R2**, sin pasar por nuestro servidor, en dos pasos:

1. `POST /api/cursos/:id/imagenes` con el tipo y el tamaño del fichero. El servidor rechaza todo lo que no sea JPEG, PNG o WebP de 2 MB como máximo, decide la clave del fichero (`cursos/<cursoId>/<uuid>.<ext>`) y devuelve una **URL firmada de subida (`PUT`) que caduca en 5 minutos**. El tipo y el tamaño van **dentro de la firma** (`ContentType` y `ContentLength`), así que R2 rechaza una subida que no coincida.
2. Tras subirla, `POST /api/cursos/:id/imagenes/confirmar` con la clave, el título y el uso. El servidor comprueba que la clave empieza por `cursos/<cursoId>/` (nadie confirma ficheros de otro curso) y en R2 (`HEAD`) que el fichero existe y que su tipo y tamaño son los permitidos, y **solo entonces** crea la fila en `curso_imagen` con la URL pública. Si no cuadra, borra el fichero y responde **400**.

Así una URL firmada no sirve para subir cualquier cosa, y en la BBDD nunca hay una imagen que no exista o no cumpla las reglas.

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
- **Si Redis falla o va lento, la app sigue funcionando, solo que sin caché:**
  - `obtener()` tiene un **tiempo máximo de 300 ms**. Si se pasa o da error, cuenta como MISS.
  - `guardar()` **nunca rompe la respuesta**: se ejecuta con `after()` y, si falla, solo se registra con `console.error`. Una respuesta buena de la IA nunca se convierte en un error por culpa de la caché.

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
