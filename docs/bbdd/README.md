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

## 3. Tablas (34)

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
| Foro | `tema_foro`, `comentario_foro`, `punto_foro`, `insignia`, `usuario_insignia` |
| Premios del perfil | `movimiento_puntos`: lo que cambia el saldo de puntos (canjes, que restan, y puntos de demo, que suman). Saldo = puntos del foro + movimientos. Los premios son datos de demo (`src/lib/demo/premios.ts`). |

### El esquema en código

| Qué | Dónde |
|---|---|
| Tablas, un fichero por bloque (`usuarios`, `catalogo`, `acceso`, `material`, `ejercicios`, `evaluaciones`, `tutor`, `foro`) | `src/lib/db/schema/` |
| Valores fijos (rol, tipo de ejercicio, estado del pedido…) como `enum` de PostgreSQL | `src/lib/db/schema/enums.ts` |
| Cliente para consultar: `getDb()`. Se crea en el primer uso (no al importar) y abre como mucho 1 conexión por instancia | `src/lib/db/client.ts` |
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
- **Iniciar sesión** con email y contraseña o con Google es una fila de `cuenta` por método. La contraseña se guarda **solo como hash** (`cuenta.password_hash`). Mientras el login sea simulado la calcula `src/lib/contrasena.ts` (scrypt); con Better Auth la calculará Better Auth.
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
5. **Trazabilidad:** se rellenan siempre `modelo` (el que lo generó) y `generado`. `revisado` empieza en `false`. En el prototipo, el material común **no se enseña a los alumnos hasta que una persona lo revisa** (decisión del #2, ver «Generar el material común»); la etiqueta «Generado por IA» es para el material personal, que no se revisa.

La IA **nunca** escribe en la BBDD directamente ni decide ids: devuelve JSON, y el código resuelve las claves (clase, módulo, concepto) y hace el `INSERT`.

### Formato de `contenido` según el tipo

Usa los tipos de `src/lib/types.ts`. En las fuentes, `videoId` es el `slug` de la clase (por ejemplo `"v04"`) y `segundo` es el momento del vídeo.

| `tipo` | `contenido` | Mínimos |
|---|---|---|
| `resumen` | `SeccionResumen[]`: `[{ "titulo", "texto", "fuente": { "videoId", "segundo" } }]` | 2 apartados; cabe en una pantalla de móvil |
| `tarjetas` | `Tarjeta[]`: `[{ "pregunta", "respuesta", "fuente": { "videoId", "segundo" } }]` | 4 tarjetas |
| `infografia` | `Infografia[]`: una, sobre el concepto de la clase (el de su misma posición en el catálogo), con una de las plantillas `capas`, `jerarquia`, `pasos` o `comparativa` | 1 |

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

### Sembrar los datos de la demo

```bash
npm run db:seed                            # BBDD local (DATABASE_URL de .env.local)
SEED_PERMITIR_REMOTO=1 npm run db:seed     # otra BBDD (p. ej., Neon), solo a propósito
```

- **Qué crea:** la categoría `programacion`; el curso de `data/catalog.json` (gratis y publicado) con sus 4 módulos, sus conceptos y una clase por vídeo (`video_url` de YouTube); **10 alumnos** (los dos primeros son los de `src/lib/datos-prueba.ts`: Lucía `lucia@demo.test` y Pablo `pablo@demo.test`), **1 profesor** (`profesora@demo.test`) y **1 admin** (`admin@demo.test`), todos con el email verificado; y la matrícula por invitación de los alumnos y del profesor (este, como `profesor` del curso). El admin no necesita matrícula.
- **Crea una cuenta** de email y contraseña (`cuenta`, proveedor `credential`) por usuario para el login simulado, con la contraseña `demo1234` (`CONTRASENA_DEMO`). Si la cuenta ya existe no la toca.
- **Crea el progreso de demostración** (`progreso`) de `src/lib/datos-prueba.ts` en el curso de la demo, para que «Tus cursos» no salga al 0 %. Si ya hay progreso de ese módulo no lo toca.
- **Crea la plantilla de ejercicios** (`plantilla_ejercicio`) de cada módulo del curso de la demo a partir de `data/ejemplos-profesor/<módulo>.json`: los tipos de ejercicio, los ejemplos del profesor y sus indicaciones para el generador. Si la plantilla ya existe, la deja como dice el fichero, porque sin panel de administración el fichero es donde el profesor configura su módulo. Si un fichero es de un módulo que no está en el curso, el seed falla sin escribir nada.
- **Crea el foro de la demo** (`tema_foro`, `comentario_foro`, `punto_foro`) a partir de `src/lib/db/seed/foro.ts`: 4 dudas respondidas (una por módulo) con respuestas valoradas por la IA (correcta, aproximada, incorrecta y «no es una respuesta»), la contestación de Sensei a cada respuesta valorada, un comentario de la profesora, una valoración corregida por la profesora y sus puntos (+3 a una buena pregunta, +1 a la buena conducta de un comentario); una de ellas (margin y padding) tiene 5 respuestas correctas de 4 personas para enseñar que solo puntúan las 3 primeras personas distintas. Además, 2 dudas sin responder para la demo en directo (la de Lucía sobre especificidad, en `m2-css`, la responde Pablo). Lucía y Pablo no responden en ninguna. Un tema se reconoce por (módulo, título): si ya existe, no se tocan ni él ni sus comentarios ni sus puntos.
- **Guarda la transcripción de cada vídeo** del curso de la demo en `documento` (tipo `transcripcion`, #39): convierte cada VTT de `data/transcripciones/` a markdown con una marca `[mm:ss]` cada ~30 s. Borra la de cada clase y la vuelve a insertar, así que repetir el seed no duplica nada. **El tutor, el material, la infografía, el material personal y el generador de ejercicios leen el temario de aquí**, no de los ficheros: en una BBDD sin este seed responden que todavía no hay contenido de los vídeos.
- **No crea** ejercicios (los genera la IA a partir de las plantillas: ver «Generar los ejercicios»), sesiones (se crean al iniciar sesión) ni pedidos (se crean al comprar).
- **Se puede repetir:** inserta o actualiza por clave natural (`slug`, `email`, `(curso, email)`…), así que ejecutarlo dos veces deja los mismos datos.
- **Solo la BBDD local:** se niega si el host de `DATABASE_URL` no es `localhost` o `127.0.0.1`, salvo con `SEED_PERMITIR_REMOTO=1`.
- Código: `scripts/seed.ts` (conexión) y `src/lib/db/seed/` (datos y `sembrar()`).
- El **límite diario de IA** (`uso_ia`, un contador por alumno y día UTC) y el **material personal** (`material_personal`, los 20 más recientes por alumno) ya se guardan en la BBDD. `/api/tutor` y `/api/material-personal` responden 404 si falta el seed.

### Generar los ejercicios

El banco de ejercicios de verificación (#4) lo genera la IA a partir de las plantillas, y el código lo guarda en `ejercicio` como **borrador**. Los alumnos solo ven los **aprobados**. Cada ejercicio tiene un **`uso`**: `video` (2 por vídeo, el test que desbloquea el siguiente), `modulo` (el test del módulo, #3) o `examen` (el examen del curso). Instrucciones del agente y cómo se revisa: [`agents/generador-ejercicios.md`](../../agents/generador-ejercicios.md).

```bash
npm run generar:ejercicios                  # BBDD local: todos los módulos y usos que aún no tienen ejercicios
npm run generar:ejercicios -- --uso=video   # solo un uso (video, modulo o examen)
npm run generar:ejercicios -- --forzar      # regenera los borradores (los aprobados no se tocan)
```

- **Se genera una vez:** si un módulo ya tiene ejercicios de un uso, no se vuelve a llamar a la IA para ese uso salvo con `--forzar`. Si falla un uso de un módulo, se repite el comando sin `--forzar` y solo pide lo que falta.
- **Solo la BBDD local,** salvo `GENERAR_PERMITIR_REMOTO=1`, igual que el seed.
- Necesita la IA configurada en `.env.local`, también `AI_MODEL_GENERADOR` (el nombre del modelo está en `.env.example`).

**Para la demo (Neon), una vez y en este orden** (la tanda completa, con el material común, está más abajo en «Para la demo (Neon), en este orden»). Lo hace quien tenga la `DATABASE_URL` de Neon, que solo está en Vercel. La dirección se pone **solo en la terminal y solo para esos comandos**, nunca en `.env.local`: si se queda ahí, cualquier prueba posterior iría contra producción. Al cerrar la terminal desaparece. En PowerShell:

```powershell
$env:DATABASE_URL = "<la de Neon>"
$env:SEED_PERMITIR_REMOTO = "1"; npm run db:seed              # 1. las plantillas (y el resto del seed, que se puede repetir)
$env:GENERAR_PERMITIR_REMOTO = "1"; npm run generar:ejercicios # 2. el banco, en borrador
npm run db:studio                                              # 3. revisar y aprobar (Studio también usa la variable de la terminal)
```

Los scripts y Drizzle Studio usan la `DATABASE_URL` de la terminal antes que la de `.env.local`.

### Generar el material común

El resumen, las tarjetas y la infografía de cada vídeo (#2, #7, #15) los genera la IA **una vez por vídeo** a partir de su transcripción, y el código los guarda en `material_clase` (una fila por clase y tipo) **sin revisar**. Los alumnos solo ven lo **revisado**: la pantalla de material del módulo junta lo de sus vídeos en orden, y una pestaña (Resumen, Tarjetas o Visual) solo aparece si tiene algo revisado. Instrucciones de los agentes: [`agents/material.md`](../../agents/material.md) y [`agents/infografia.md`](../../agents/infografia.md).

```bash
npm run generar:material                  # BBDD local: lo que les falte a todos los vídeos
npm run generar:material -- m2-css        # solo los vídeos de ese módulo
npm run generar:material -- --forzar      # regenera también lo no revisado (lo revisado no se toca nunca)
```

- **Solo genera lo que falta:** si un vídeo ya tiene un tipo guardado, no se vuelve a llamar a la IA. Cada vídeo se guarda en cuanto se genera; si algo falla, se vuelve a ejecutar y solo se repite lo que falta.
- **Si falla la infografía** de un vídeo (a veces el modelo no respeta el formato, y se reintenta una vez), su resumen y sus tarjetas se guardan igual.
- **La infografía de cada vídeo** es sobre el concepto de su **misma posición** en `data/catalog.json` (vídeo 1 ↔ concepto 1). Si se añade un vídeo a un módulo, hay que añadir también su concepto en la misma posición.
- **Necesita** el seed (para que existan las clases) y la IA configurada en `.env.local`, también `AI_MODEL_GENERADOR`. **Solo la BBDD local,** salvo `GENERAR_PERMITIR_REMOTO=1`. Coste: unos céntimos por los 12 vídeos.

**Revisar** (con `npm run db:studio` → tabla `material_clase`): leer el `contenido` de cada fila y poner `revisado` a `true` en lo que esté bien. Qué mirar:

- Que lo que dice sea correcto y salga del vídeo; las fuentes (`videoId`, `segundo`) llevan al minuto donde se explica.
- En las infografías, que la plantilla encaje: `capas` solo si cada elemento está de verdad **dentro** del anterior (como el modelo de caja), `pasos` solo si es un proceso en orden, `jerarquia` si es quién gana a quién y `comparativa` para opciones del mismo tipo.
- **Si algo está casi bien, se corrige a mano** en vez de dejar el vídeo sin ese material: se edita el JSON de `contenido` en Studio (por ejemplo, cambiar una infografía de `capas` a `comparativa` con los mismos datos, o corregir una frase) y se aprueba. Es lo que haría el profesor al revisar.
- **Para regenerar solo una fila**, se borra esa fila en Studio y se vuelve a ejecutar `npm run generar:material`, que solo genera lo que falta. `--forzar` regenera todo lo no revisado.

### Para la demo (Neon), en este orden

Lo hace quien tenga la `DATABASE_URL` de Neon, como en «Generar los ejercicios»: la dirección **solo en la terminal**, nunca en `.env.local`. En PowerShell:

```powershell
$env:DATABASE_URL = "<la de Neon>"
npm run db:migrate                                              # 0. las tablas y las migraciones nuevas
$env:SEED_PERMITIR_REMOTO = "1"; npm run db:seed               # 1. curso, clases, usuarios y plantillas
$env:GENERAR_PERMITIR_REMOTO = "1"; npm run generar:ejercicios  # 2. el banco de ejercicios, en borrador
npm run generar:material                                        # 3. resumen, tarjetas e infografía de cada vídeo, sin revisar
npm run db:studio                                               # 4. revisar y aprobar los ejercicios y el material
```

Y **el día de la demo**, `npm run db:seed:actividad` (ver abajo), con los ejercicios ya aprobados. Hasta que se hagan estos pasos, la web desplegada no enseña material ni ejercicios: no es que esté roto.

### Actividad simulada para el Radar

El Radar del tutor (#5) necesita actividad para enseñar algo en la demo. `npm run db:seed:actividad` la crea:

- **Quién:** 20 alumnos simulados (`*@simulado.demo.test`) más los inventados del seed. **Nunca** los de la demo en directo (Lucía y Pablo) ni nadie que se registre de verdad: solo emails de prueba (`*.demo.test`).
- **Qué:** intentos sobre los **ejercicios aprobados** de vídeo y de módulo (`intento`; los de examen no), dudas al tutor ya filtradas (`conversacion` y `mensaje`) y su `progreso`. Las fechas son relativas al día en que se ejecuta.
- **Patrones:** la especificidad es el concepto más fallado (en torno al 60 %), hay alumnos atascados (3 fallos seguidos en los últimos 3 días) y alumnos inactivos (más de 9 días sin entrar).
- **Orden:** después de `npm run db:seed` y de **aprobar el banco de ejercicios**. Sin ejercicios aprobados no crea intentos y lo avisa.
- **Se puede repetir:** borra la actividad anterior de esos alumnos y la vuelve a crear. Conviene ejecutarlo el día de la demo para que las fechas sean recientes.
- **Neon:** como el seed, con `SEED_PERMITIR_REMOTO=1`.
- Código: `src/lib/demo/actividad.ts` (qué se genera, función pura) y `src/lib/db/seed/actividad.ts` (cómo se guarda).

### Tests con BBDD

Los tests de integración crean su propia BBDD en el Docker local (`hackado_test_…`), le aplican las migraciones de `drizzle/`, la usan y la borran: `crearBdPrueba()` en `src/lib/db/test-utils.ts`. Si el Docker no está arrancado, esos tests se saltan con un aviso. Nunca tocan la BBDD `hackado`.

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
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Caché compartida (opcional) | Vercel → *Storage → Marketplace → Upstash Redis* (región UE): se añaden solas. Sin ellas, la app usa caché en memoria |
| `STRIPE_WEBHOOK_SECRET` | Comprobar que el aviso de pago viene de Stripe | En local, `stripe listen --forward-to localhost:3000/api/pagos/webhook` (`whsec_…`); en Vercel, el del webhook creado en el panel |

Better Auth, el SDK de R2 y Stripe **aún no están instalados**: se instalan en la PR que use cada uno. Iniciar sesión con Apple queda fuera del MVP: exige una cuenta de pago de Apple Developer.

### Pago simulado con Stripe (modo test)

1. «Comprar» crea un `pedido` en estado `pendiente` y una sesión de **Stripe Checkout** con el precio de `curso.precio_centimos`.
2. El alumno paga en la página de Stripe con una tarjeta de prueba (`4242 4242 4242 4242`, fecha futura, cualquier CVC). No se mueve dinero real.
3. Stripe llama al webhook. El servidor **comprueba la firma** con `STRIPE_WEBHOOK_SECRET`, marca el pedido como `pagado` y crea la `matricula` con `origen = 'compra'`, en una sola transacción y sin repetir nada si Stripe reenvía el aviso (detalle en [`docs/arquitectura.md`](../arquitectura.md#webhook-de-stripe)).

---

## 6. Qué entra en la demo del 30/11

El esquema se crea completo, pero solo se construye la interfaz de una parte:

| Con pantallas en la demo | Tablas listas, pantallas después |
|---|---|
| Inicio de sesión, catálogo, clases y documentos, material IA, tutor y límite diario, ejercicios e intentos, diagnóstico y ruta personal, compra simulada con Stripe | Foro con validación, insignias, exámenes con nota |
