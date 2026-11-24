# Base de datos

> Issue #13 · El esquema vive en [`src/lib/db/schema/`](../../src/lib/db/schema/) (Drizzle) y **es la fuente de verdad**: si este documento y el código no coinciden, manda el código y se corrige el documento.

Este documento es la referencia para personas **y para las IAs** que trabajen en el proyecto. Si algo de aquí choca con otro documento, gana este y hay que corregir el otro.

---

## 1. Regla principal: la BBDD manda

1. **La BBDD es la única fuente de verdad** de todo lo que la app guarda: usuarios, catálogo, documentos, material generado, intentos, progreso, pagos y foro.
2. **No se crean ficheros de datos nuevos** en `data/`. Los que hay (`catalog.json`, `material/`, `infografias/`, `transcripciones/`) son **solo el origen del seed**: se importan a la BBDD una vez y, cuando el código lea de la BBDD, se borran.
3. **El esquema define qué se guarda y cómo.** Se rellenan exactamente los campos que pide cada tabla, con el tipo y el formato que pide. No se añaden campos que no existen ni se guardan datos «por si acaso» en un JSON libre.
4. **Cambiar el esquema es cambiar el contrato.** Se hace con una migración de Drizzle en una PR propia y se avisa al equipo antes de fusionar (ver `CONTRIBUTING.md` y el apartado 3).

---

## 2. Dónde vive cada cosa

| Qué | Dónde | Qué guarda la BBDD |
|---|---|---|
| Datos de la app (usuarios, cursos, intentos…) | PostgreSQL en **Neon**, región UE (Frankfurt) | Todo |
| Transcripciones y apuntes de cada clase | Tabla `documento`, en **markdown** | El texto completo |
| Vídeos | **YouTube** (embed) | Solo el enlace: `clase.video_url` |
| Imágenes de los cursos | Bucket de **Cloudflare R2** (jurisdicción UE) | La URL, un título que dice dónde va y su uso: `curso_imagen` |
| Material generado por la IA | Tabla `material_clase` (común) y `material_personal` (de un alumno) | El contenido en JSON, con el formato del apartado 4 |
| Pagos | **Stripe** en modo test | El pedido y su estado: `pedido` |

Un markdown largo no es un problema: las 12 transcripciones del curso ocupan unos 146 KB en total, y PostgreSQL comprime y guarda aparte los textos grandes.

Opcional: un script exportará los markdown a `conocimiento/<curso>/<modulo>/<clase>.md` para verlos como una bóveda. Esa carpeta es **solo lectura**: se regenera desde la BBDD y nunca se edita a mano.

---

## 3. Tablas (31)

| Bloque | Tablas |
|---|---|
| Usuarios y acceso | `usuario`, `cuenta`, `sesion`, `verificacion` |
| Catálogo | `categoria`, `curso`, `curso_imagen`, `modulo`, `clase`, `concepto`, `documento` |
| Etiquetas | `etiqueta`, `modulo_etiqueta` |
| Compra y matrícula | `pedido`, `matricula` |
| Material IA | `material_clase`, `material_personal` |
| Ejercicios | `plantilla_ejercicio`, `ejercicio`, `intento`, `progreso` |
| Evaluaciones | `evaluacion`, `pregunta_evaluacion`, `intento_evaluacion` |
| Tutor IA | `conversacion`, `mensaje`, `uso_ia` |
| Foro | `tema_foro`, `comentario_foro`, `insignia`, `usuario_insignia` |

### El esquema en código

| Qué | Dónde |
|---|---|
| Tablas, un fichero por bloque (`usuarios`, `catalogo`, `acceso`, `material`, `ejercicios`, `evaluaciones`, `tutor`, `foro`) | `src/lib/db/schema/` |
| Valores fijos (rol, tipo de ejercicio, estado del pedido…) como `enum` de PostgreSQL | `src/lib/db/schema/enums.ts` |
| Cliente para consultar (`db`) | `src/lib/db/client.ts` |
| Migraciones SQL generadas | `drizzle/` |

Para cambiar el esquema:

1. Edita las tablas en `src/lib/db/schema/`.
2. `npm run db:generate -- --name que_cambia` crea la migración SQL en `drizzle/`.
3. **Revisa el SQL generado** (que no borre columnas o datos sin querer).
4. `npm run db:migrate` la aplica a tu BBDD local.

**Una migración por PR**, y una migración que ya se ha aplicado no se edita: se crea otra.

**Dos tipos de tipos:**

- **Tipos de fila** (`Usuario`, `NuevoUsuario`, `MaterialClase`…): salen del esquema (`typeof usuario.$inferSelect` / `$inferInsert`) y se exportan desde `src/lib/db/schema/`. Son **solo para la capa de datos** (consultas e inserciones).
- **`src/lib/types.ts`**: el contrato de la API con el frontend y la IA. No se cambia para parecerse a la BBDD; la capa de datos convierte una cosa en la otra. Algunos nombres coinciden (`Curso`, `Modulo`, `Intento`…): importa cada uno de su sitio.

Los `enum` que también existen en `types.ts` (`TipoEjercicio`, `EstadoModulo`, `TipoMaterial`…) tienen que tener los mismos valores: lo comprueba `src/lib/db/schema.test.ts`.

Jerarquía del catálogo: **Categoría → Curso → Módulo → Clase**. Cada clase es un vídeo con sus documentos. Los temas (HTML, CSS, lógica…) **no son un nivel**: son `etiqueta`s de los módulos.

Decisiones de diseño:

- **Visitante** no es una fila: es quien no ha iniciado sesión. Los roles son `alumno`, `profesor` y `admin`.
- **Iniciar sesión** con email y contraseña o con Google es una fila de `cuenta` por método. La contraseña se guarda **solo como hash** (`cuenta.password_hash`) y la calcula Better Auth, nunca nuestro código.
- **El acceso a un curso se da a un email** (`matricula`), aunque esa persona aún no se haya registrado. Al entrar por primera vez se enlaza con su usuario. **Los emails se guardan siempre en minúsculas** (la BBDD lo exige), para que `Ana@x.es` y `ana@x.es` sean la misma persona: el código los pasa a minúsculas antes de guardar o buscar.
- **La matrícula por compra solo la crea el webhook de Stripe**, nunca el navegador. La BBDD exige que una matrícula por compra tenga su pedido y que una invitación no lo tenga.
- **`matricula.orden_modulos`** es una lista de ids: PostgreSQL no puede comprobar claves ajenas dentro de una lista, así que el código comprueba que todos los módulos son de ese curso.
- **Diagnóstico y ruta personal:** cada opción del diagnóstico suma puntos a unas etiquetas; el módulo que más encaja (`suma(puntos × peso)`) pasa a ser el principal y se guarda el orden en `matricula.orden_modulos`.
- **Los puntos del foro no se guardan:** se calculan a partir de las respuestas validadas como buenas. Las insignias sí (`usuario_insignia`). Valida la IA o un profesor, y el profesor prevalece. Un comentario pendiente no tiene validador ni fecha; uno validado tiene los dos. Si se borra la cuenta del profesor, la validación se conserva.
- **El dinero se guarda en céntimos** (`integer`), como hace Stripe.

---

## 4. Cómo guarda la IA el material que genera

Se aplica a los agentes que producen contenido: material de cada clase (resumen, tarjetas, infografía), material personal, ejercicios y validación del foro.

### Flujo obligatorio

1. **Buscar antes de generar.** Si ya existe la fila (`material_clase` con esa `clase_id` y ese `tipo`), se devuelve y **no se llama a la IA**.
2. **Generar** con el agente correspondiente. A la IA solo le llega contenido del curso y texto filtrado (ver SPEC, apartado 6).
3. **Validar con código** la respuesta de la IA antes de guardarla, con las funciones de `src/lib/agentes/` (`parsearObjetoJson`, `validarFuentes`, `validarMaterial`, `validarInfografia`…). Las fuentes que no existen se descartan y, si no se llega al mínimo, **no se guarda nada**.
4. **Guardar** con `INSERT … ON CONFLICT (clase_id, tipo) DO NOTHING` y volver a leer. Así, si dos alumnos lo piden a la vez, solo se guarda una vez.
5. **Trazabilidad:** se rellenan siempre `modelo` (el que lo generó) y `generado`. `revisado` empieza en `false`; mientras no lo revise un profesor, la interfaz lo muestra con la etiqueta «Generado por IA».

La IA **nunca** escribe en la BBDD directamente ni decide ids: devuelve JSON, y el código resuelve las claves (clase, módulo, concepto) y hace el `INSERT`.

### Formato de `contenido` según el tipo

Usa los tipos de `src/lib/types.ts`. En las fuentes, `videoId` es el `slug` de la clase (por ejemplo `"v04"`) y `segundo` es el momento del vídeo.

| `tipo` | `contenido` | Mínimos |
|---|---|---|
| `resumen` | `SeccionResumen[]`: `[{ "titulo", "texto", "fuente": { "videoId", "segundo" } }]` | 2 apartados; cabe en una pantalla de móvil |
| `tarjetas` | `Tarjeta[]`: `[{ "pregunta", "respuesta", "fuente": { "videoId", "segundo" } }]` | 4 tarjetas |
| `infografia` | `Infografia[]`: una por concepto de la clase, con una de las plantillas `capas`, `jerarquia`, `pasos` o `comparativa` | 1 |

`material_personal.contenido` usa el mismo formato que `resumen` o `tarjetas`. Ningún contenido generado puede incluir datos personales.

---

## 5. Entornos y variables de entorno

### BBDD local con Docker (para desarrollar)

Cada persona trabaja con **su propia BBDD en Docker**: puede romperla y regenerarla sin afectar a nadie. Solo Postgres va en Docker; la app se sigue arrancando con `npm run dev`.

| Entorno | BBDD | `DATABASE_URL` |
|---|---|---|
| Local | Postgres 17 en Docker (`docker-compose.yml`) | `postgres://hackado:hackado@localhost:5433/hackado` |
| Producción | Neon (UE) | La cadena *pooled* de Neon (la que lleva `-pooler`). **Solo está en Vercel; no se comparte con el equipo** |

```bash
npm run db:up        # arranca Postgres (necesita Docker Desktop abierto)
npm run db:migrate   # crea o actualiza las tablas con las migraciones de drizzle/
npm run db:studio    # abre Drizzle Studio para ver los datos
npm run db:down      # lo para; los datos se conservan
docker compose down -v   # lo para y BORRA los datos locales
```

- Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (en Windows, con WSL2).
- **Puerto 5433, no 5432:** así no choca con un PostgreSQL instalado en el ordenador. Si hubiera un Postgres en 5432, una `DATABASE_URL` con ese puerto se conectaría a él sin dar error. Para usar otro puerto: variable `DB_PORT` al arrancar y el mismo puerto en `DATABASE_URL`.
- **Solo desde tu ordenador:** el puerto escucha en `127.0.0.1`, así que nadie de la misma wifi puede entrar, aunque la contraseña `hackado` esté en el repositorio.
- **Plan B sin Docker:** una rama propia de Neon (una copia aislada de la BBDD), nunca la de producción.
- **Driver:** se usa el driver estándar de PostgreSQL con Drizzle, no el driver HTTP de Neon, porque este último no conecta con un Postgres normal y el Docker local no serviría.
- Los comandos `db:generate`, `db:migrate` y `db:studio` leen `DATABASE_URL` de `.env.local` (o del entorno, si ya está definida).
- **Driver en producción:** el cliente usa `prepare: false`, porque la cadena *pooled* de Neon no admite sentencias preparadas.

### Variables

Las claves van en `.env.local` (en tu ordenador) y en Vercel (*Settings → Environment Variables*). **Nunca en el repositorio.** Lista completa en `.env.example`.

| Variable | Para qué | De dónde sale |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | En local, la de la tabla de arriba (puerto 5433). En producción, Neon → proyecto en región UE → *Connection string* (pooled) |
| `BETTER_AUTH_SECRET` | Firma las sesiones | Cadena aleatoria de 32+ caracteres: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL base de la app | `http://localhost:3000` en local; la URL de Vercel en producción |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Iniciar sesión con Google | Google Cloud Console → *Credentials* → *OAuth client ID* (web). Redirección: `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `R2_ACCOUNT_ID` | Cuenta de Cloudflare | Panel de Cloudflare → R2 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Subir imágenes al bucket | R2 → *Manage API tokens* → token con permiso de lectura y escritura **solo en ese bucket** |
| `R2_BUCKET` | Nombre del bucket | El que creéis, con jurisdicción UE |
| `R2_PUBLIC_URL` | URL pública de las imágenes (la que se guarda en `curso_imagen.url`) | Dominio público del bucket (`r2.dev` o uno propio) |
| `STRIPE_SECRET_KEY` | Crear sesiones de Checkout | Stripe en **modo test** → *Developers → API keys* (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Comprobar que el aviso de pago viene de Stripe | En local, `stripe listen --forward-to localhost:3000/api/stripe/webhook` (`whsec_…`); en Vercel, el del webhook creado en el panel |

Better Auth, el SDK de R2 y Stripe **aún no están instalados**: se instalan en la PR que use cada uno. Iniciar sesión con Apple queda fuera del MVP: exige una cuenta de pago de Apple Developer.

### Pago simulado con Stripe (modo test)

1. «Comprar» crea un `pedido` en estado `pendiente` y una sesión de **Stripe Checkout** con el precio de `curso.precio_centimos`.
2. El alumno paga en la página de Stripe con una tarjeta de prueba (`4242 4242 4242 4242`, fecha futura, cualquier CVC). No se mueve dinero real.
3. Stripe llama al webhook. El servidor **comprueba la firma** con `STRIPE_WEBHOOK_SECRET`, marca el pedido como `pagado` y crea la `matricula` con `origen = 'compra'`.

---

## 6. Qué entra en la demo del 30/11

El esquema se crea completo, pero solo se construye la interfaz de una parte:

| Con pantallas en la demo | Tablas listas, pantallas después |
|---|---|
| Inicio de sesión, catálogo, clases y documentos, material IA, tutor y límite diario, ejercicios e intentos, diagnóstico y ruta personal, compra simulada con Stripe | Foro con validación, insignias, exámenes con nota |
