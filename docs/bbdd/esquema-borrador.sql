-- Draft database schema for team discussion (issue #13). PostgreSQL.
-- Not the source of truth: the final schema will live in Drizzle (src/lib/db/schema.ts).
-- Enumerations are written as text + CHECK so ChartDB can import them; Drizzle will use pgEnum.
-- Money is stored in cents (integer), as Stripe does.

-- ─── Users and authentication (Better Auth tables, renamed) ─────────────────

CREATE TABLE usuario (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                      text NOT NULL,
  email                       text NOT NULL UNIQUE,
  email_verificado            boolean NOT NULL DEFAULT false,
  imagen_url                  text,
  rol                         text NOT NULL DEFAULT 'alumno' CHECK (rol IN ('alumno', 'profesor', 'admin')),
  es_menor                    boolean NOT NULL DEFAULT false,
  consentimiento_tutor_legal  boolean NOT NULL DEFAULT false,
  seudonimo                   text NOT NULL UNIQUE, -- the only identifier the AI ever sees
  creado                      timestamptz NOT NULL DEFAULT now(),
  actualizado                 timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cuenta ( -- one row per sign-in method of a user: 'credential' (email + password), 'google', 'apple'...
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  proveedor              text NOT NULL,
  id_cuenta_proveedor    text NOT NULL,
  password_hash          text, -- only for proveedor = 'credential'; hashed by the auth library, never plain text
  access_token           text,
  refresh_token          text,
  id_token               text,
  expira_access_token    timestamptz,
  scope                  text,
  creado                 timestamptz NOT NULL DEFAULT now(),
  actualizado            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proveedor, id_cuenta_proveedor)
);

CREATE TABLE sesion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token        text NOT NULL UNIQUE,
  expira       timestamptz NOT NULL,
  ip           text,
  user_agent   text,
  creado       timestamptz NOT NULL DEFAULT now(),
  actualizado  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verificacion ( -- email verification / magic link tokens
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador  text NOT NULL,
  valor          text NOT NULL,
  expira         timestamptz NOT NULL,
  creado         timestamptz NOT NULL DEFAULT now()
);

-- ─── Catalog: course > module > class ───────────────────────────────────────

CREATE TABLE categoria ( -- to filter the catalog: "programacion", "ia", "cocina", "costura", "oposiciones"...
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  nombre      text NOT NULL,
  icono_url   text,
  orden       integer NOT NULL DEFAULT 0
);

CREATE TABLE curso (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id     uuid NOT NULL REFERENCES categoria(id),
  slug             text NOT NULL UNIQUE, -- e.g. "intro-desarrollo-web"
  titulo           text NOT NULL,
  descripcion      text NOT NULL,
  precio_centimos  integer NOT NULL DEFAULT 0 CHECK (precio_centimos >= 0),
  moneda           text NOT NULL DEFAULT 'eur',
  publicado        boolean NOT NULL DEFAULT false,
  creado           timestamptz NOT NULL DEFAULT now(),
  actualizado      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE curso_imagen ( -- the file lives in a bucket; here only its URL
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id  uuid NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  url       text NOT NULL,
  titulo    text NOT NULL, -- says where it goes, e.g. "Banner de la home"
  uso       text NOT NULL CHECK (uso IN ('portada', 'banner', 'miniatura', 'galeria')),
  orden     integer NOT NULL DEFAULT 0,
  creado    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE modulo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id        uuid NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  slug            text NOT NULL, -- e.g. "m2-css" (current id in catalog.json)
  titulo          text NOT NULL,
  descripcion     text NOT NULL,
  orden_sugerido  integer NOT NULL,
  UNIQUE (curso_id, slug)
);

CREATE TABLE concepto (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id  uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  slug       text NOT NULL, -- e.g. "css-especificidad"
  nombre     text NOT NULL,
  UNIQUE (modulo_id, slug)
);

CREATE TABLE clase (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id          uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  slug               text NOT NULL, -- e.g. "v04"
  titulo             text NOT NULL,
  video_url          text NOT NULL, -- YouTube link
  duracion_segundos  integer NOT NULL,
  orden              integer NOT NULL,
  UNIQUE (modulo_id, slug)
);

CREATE TABLE documento ( -- long markdown linked to a class: transcript, notes
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id      uuid NOT NULL REFERENCES clase(id) ON DELETE CASCADE,
  tipo          text NOT NULL CHECK (tipo IN ('transcripcion', 'apuntes')),
  titulo        text NOT NULL,
  contenido_md  text NOT NULL, -- transcripts keep [mm:ss] marks to cite the exact minute
  creado        timestamptz NOT NULL DEFAULT now(),
  actualizado   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE etiqueta ( -- e.g. "html", "css", "frameworks", "logica"
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug    text NOT NULL UNIQUE,
  nombre  text NOT NULL
);

CREATE TABLE modulo_etiqueta ( -- tags of a module; used by the diagnostic to find the best-fitting module
  modulo_id    uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  etiqueta_id  uuid NOT NULL REFERENCES etiqueta(id) ON DELETE CASCADE,
  peso         numeric(3, 2) NOT NULL DEFAULT 1 CHECK (peso > 0 AND peso <= 1), -- how much the tag weighs in the module
  PRIMARY KEY (modulo_id, etiqueta_id)
);

-- ─── Access and payments ────────────────────────────────────────────────────

CREATE TABLE pedido (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             uuid NOT NULL REFERENCES usuario(id),
  curso_id               uuid NOT NULL REFERENCES curso(id),
  importe_centimos       integer NOT NULL CHECK (importe_centimos >= 0),
  moneda                 text NOT NULL DEFAULT 'eur',
  estado                 text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'fallido', 'reembolsado')),
  stripe_session_id      text UNIQUE,
  stripe_payment_intent  text,
  creado                 timestamptz NOT NULL DEFAULT now(),
  pagado_en              timestamptz
);

CREATE TABLE matricula ( -- access to a course is granted to an EMAIL, even before the user signs up
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id     uuid NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  email        text NOT NULL,
  usuario_id   uuid REFERENCES usuario(id) ON DELETE SET NULL, -- linked on first sign-in
  rol_en_curso text NOT NULL DEFAULT 'alumno' CHECK (rol_en_curso IN ('alumno', 'profesor')),
  origen       text NOT NULL CHECK (origen IN ('compra', 'invitacion')),
  pedido_id    uuid REFERENCES pedido(id), -- only for origen = 'compra', created by the Stripe webhook
  -- Personal route, set by the diagnostic. NULL = default order (modulo.orden_sugerido).
  modulo_principal_id  uuid REFERENCES modulo(id) ON DELETE SET NULL,
  orden_modulos        uuid[], -- module ids in the order this student will see them
  creado       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curso_id, email)
);

-- ─── AI-generated material (generated once, then reused) ────────────────────

CREATE TABLE material_clase ( -- shared by every student of the class
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id   uuid NOT NULL REFERENCES clase(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('resumen', 'tarjetas', 'infografia')),
  contenido  jsonb NOT NULL,
  modelo     text NOT NULL, -- model that generated it, for traceability
  revisado   boolean NOT NULL DEFAULT false,
  generado   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clase_id, tipo) -- prevents generating it twice
);

CREATE TABLE material_personal ( -- generated on demand for ONE student
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  modulo_id    uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  concepto_id  uuid REFERENCES concepto(id),
  tipo         text NOT NULL CHECK (tipo IN ('resumen', 'tarjetas')),
  nivel        text NOT NULL DEFAULT 'normal' CHECK (nivel IN ('basico', 'normal', 'avanzado')),
  enfoque      text CHECK (char_length(enfoque) <= 200),
  contenido    jsonb NOT NULL,
  generado     timestamptz NOT NULL DEFAULT now()
);

-- ─── Exercises, attempts and progress ───────────────────────────────────────

CREATE TABLE plantilla_ejercicio ( -- examples written by the teacher
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id     uuid NOT NULL UNIQUE REFERENCES modulo(id) ON DELETE CASCADE,
  tipos         text[] NOT NULL, -- test | respuesta_corta | abierta | codigo
  ejemplos      jsonb NOT NULL,
  indicaciones  text
);

CREATE TABLE ejercicio (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id           uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  concepto_id         uuid NOT NULL REFERENCES concepto(id),
  clase_id            uuid NOT NULL REFERENCES clase(id), -- video to review
  segundo_referencia  integer NOT NULL DEFAULT 0,          -- exact minute to review
  tipo                text NOT NULL CHECK (tipo IN ('test', 'respuesta_corta', 'abierta', 'codigo')),
  enunciado           text NOT NULL,
  opciones            jsonb,
  solucion            jsonb,
  rubrica             text,
  estado              text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'aprobado')),
  creado              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE intento (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  ejercicio_id      uuid NOT NULL REFERENCES ejercicio(id) ON DELETE CASCADE,
  respuesta         jsonb NOT NULL,
  puntuacion        numeric(3, 2) NOT NULL CHECK (puntuacion BETWEEN 0 AND 1),
  correcto          boolean NOT NULL,
  feedback          text NOT NULL,
  repasar_clase_id  uuid REFERENCES clase(id),
  repasar_segundo   integer,
  revision_humana   boolean NOT NULL DEFAULT false,
  fecha             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE progreso (
  usuario_id             uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  modulo_id              uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  estado                 text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'dominado', 'completado')),
  aciertos_por_concepto  jsonb NOT NULL DEFAULT '{}', -- { "css-especificidad": 0.4 }
  actualizado            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, modulo_id)
);

-- ─── Assessments: diagnostic, tests and exams ───────────────────────────────

CREATE TABLE evaluacion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id       uuid NOT NULL REFERENCES curso(id) ON DELETE CASCADE,
  modulo_id      uuid REFERENCES modulo(id) ON DELETE CASCADE, -- NULL = whole course (e.g. the diagnostic)
  tipo           text NOT NULL CHECK (tipo IN ('diagnostico', 'test', 'examen')),
  titulo         text NOT NULL,
  nota_aprobado  numeric(5, 2), -- e.g. 5.00 out of 10; NULL for the diagnostic (nobody fails it)
  creado         timestamptz NOT NULL DEFAULT now(),
  CHECK (tipo = 'diagnostico' OR nota_aprobado IS NOT NULL)
);

CREATE TABLE pregunta_evaluacion (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id  uuid NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
  orden          integer NOT NULL,
  tipo           text NOT NULL CHECK (tipo IN ('test', 'respuesta_corta', 'abierta', 'codigo')),
  enunciado      text NOT NULL,
  -- Diagnostic: each option adds points to tags, e.g.
  --   [{ "texto": "Quiero diseñar webs bonitas", "etiquetas": { "css": 3, "frameworks": 1 } }]
  -- Test/exam: [{ "texto": "..." }] and the right answer goes in solucion.
  opciones       jsonb,
  solucion       jsonb,
  rubrica        text,
  puntos         numeric(5, 2) NOT NULL DEFAULT 1,
  UNIQUE (evaluacion_id, orden)
);

CREATE TABLE intento_evaluacion (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  evaluacion_id          uuid NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
  respuestas             jsonb NOT NULL, -- { "<pregunta_id>": <respuesta> }
  nota                   numeric(5, 2),  -- tests and exams
  aprobado               boolean,        -- tests and exams
  porcentajes_etiquetas  jsonb,          -- diagnostic: { "css": 0.60, "html": 0.25, "logica": 0.15 }
  fecha                  timestamptz NOT NULL DEFAULT now()
);

-- ─── AI tutor ───────────────────────────────────────────────────────────────

CREATE TABLE conversacion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  modulo_id   uuid NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
  creada      timestamptz NOT NULL DEFAULT now(),
  caduca      timestamptz NOT NULL DEFAULT now() + interval '90 days' -- GDPR retention
);

CREATE TABLE mensaje (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id  uuid NOT NULL REFERENCES conversacion(id) ON DELETE CASCADE,
  rol              text NOT NULL CHECK (rol IN ('alumno', 'tutor')),
  texto            text NOT NULL, -- already filtered (no personal data)
  fuentes          jsonb, -- [{ "claseId": "...", "segundo": 120 }]
  fecha            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE uso_ia ( -- daily AI quota per student
  usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  dia         date NOT NULL,
  total       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, dia)
);

-- ─── Forum (tables only for the MVP; screens later) ─────────────────────────

CREATE TABLE tema_foro (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id     uuid NOT NULL REFERENCES clase(id) ON DELETE CASCADE,
  autor_id     uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  titulo       text NOT NULL,
  cuerpo       text NOT NULL,
  creado       timestamptz NOT NULL DEFAULT now(),
  actualizado  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comentario_foro (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id         uuid NOT NULL REFERENCES tema_foro(id) ON DELETE CASCADE,
  autor_id        uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  respuesta_a_id  uuid REFERENCES comentario_foro(id) ON DELETE CASCADE, -- reply to another comment
  cuerpo          text NOT NULL,
  -- Good-answer validation: done by the AI (text sent filtered, as always) or by a teacher.
  -- A teacher's decision overrides the AI's. Points are NOT stored: they are computed from
  -- validated comments (e.g. 10 points per 'buena'), so they can never get out of sync.
  validacion      text NOT NULL DEFAULT 'pendiente' CHECK (validacion IN ('pendiente', 'buena', 'no_util')),
  validado_por    text CHECK (validado_por IN ('ia', 'profesor')),
  profesor_id     uuid REFERENCES usuario(id) ON DELETE SET NULL, -- only when validado_por = 'profesor'
  validado_en     timestamptz,
  creado          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE insignia ( -- e.g. "Primera buena respuesta", "Experto en CSS"
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  nombre       text NOT NULL,
  descripcion  text NOT NULL,
  icono_url    text,
  -- Rule to earn it, evaluated in code, e.g. { "respuestasBuenas": 5 } or { "respuestasBuenas": 3, "etiqueta": "css" }
  criterio     jsonb NOT NULL
);

CREATE TABLE usuario_insignia (
  usuario_id   uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  insignia_id  uuid NOT NULL REFERENCES insignia(id) ON DELETE CASCADE,
  obtenida     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, insignia_id) -- each badge is earned only once
);
