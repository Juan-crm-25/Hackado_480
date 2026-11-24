CREATE TYPE "public"."estado_ejercicio" AS ENUM('borrador', 'aprobado');--> statement-breakpoint
CREATE TYPE "public"."estado_modulo" AS ENUM('pendiente', 'en_curso', 'dominado', 'completado');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido" AS ENUM('pendiente', 'pagado', 'fallido', 'reembolsado');--> statement-breakpoint
CREATE TYPE "public"."nivel_material" AS ENUM('basico', 'normal', 'avanzado');--> statement-breakpoint
CREATE TYPE "public"."origen_matricula" AS ENUM('compra', 'invitacion');--> statement-breakpoint
CREATE TYPE "public"."rol_en_curso" AS ENUM('alumno', 'profesor');--> statement-breakpoint
CREATE TYPE "public"."rol_mensaje" AS ENUM('alumno', 'tutor');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('alumno', 'profesor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('transcripcion', 'apuntes');--> statement-breakpoint
CREATE TYPE "public"."tipo_ejercicio" AS ENUM('test', 'respuesta_corta', 'abierta', 'codigo');--> statement-breakpoint
CREATE TYPE "public"."tipo_evaluacion" AS ENUM('diagnostico', 'test', 'examen');--> statement-breakpoint
CREATE TYPE "public"."tipo_material" AS ENUM('resumen', 'tarjetas', 'infografia');--> statement-breakpoint
CREATE TYPE "public"."tipo_material_personal" AS ENUM('resumen', 'tarjetas');--> statement-breakpoint
CREATE TYPE "public"."uso_imagen" AS ENUM('portada', 'banner', 'miniatura', 'galeria');--> statement-breakpoint
CREATE TYPE "public"."validacion_foro" AS ENUM('pendiente', 'buena', 'no_util');--> statement-breakpoint
CREATE TYPE "public"."validador_foro" AS ENUM('ia', 'profesor');--> statement-breakpoint
CREATE TABLE "cuenta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"proveedor" text NOT NULL,
	"id_cuenta_proveedor" text NOT NULL,
	"password_hash" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expira_access_token" timestamp with time zone,
	"scope" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuenta_proveedor_id_cuenta_proveedor_unique" UNIQUE("proveedor","id_cuenta_proveedor")
);
--> statement-breakpoint
CREATE TABLE "sesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expira" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesion_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagen_url" text,
	"rol" "rol_usuario" DEFAULT 'alumno' NOT NULL,
	"es_menor" boolean DEFAULT false NOT NULL,
	"consentimiento_tutor_legal" boolean DEFAULT false NOT NULL,
	"seudonimo" text NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email"),
	CONSTRAINT "usuario_seudonimo_unique" UNIQUE("seudonimo"),
	CONSTRAINT "usuario_email_check" CHECK ("usuario"."email" = lower("usuario"."email"))
);
--> statement-breakpoint
CREATE TABLE "verificacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identificador" text NOT NULL,
	"valor" text NOT NULL,
	"expira" timestamp with time zone NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"icono_url" text,
	"orden" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categoria_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "clase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"video_url" text NOT NULL,
	"duracion_segundos" integer NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "clase_modulo_id_slug_unique" UNIQUE("modulo_id","slug")
);
--> statement-breakpoint
CREATE TABLE "concepto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "concepto_modulo_id_slug_unique" UNIQUE("modulo_id","slug")
);
--> statement-breakpoint
CREATE TABLE "curso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"precio_centimos" integer DEFAULT 0 NOT NULL,
	"moneda" text DEFAULT 'eur' NOT NULL,
	"publicado" boolean DEFAULT false NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curso_slug_unique" UNIQUE("slug"),
	CONSTRAINT "curso_precio_centimos_check" CHECK ("curso"."precio_centimos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "curso_imagen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"url" text NOT NULL,
	"titulo" text NOT NULL,
	"uso" "uso_imagen" NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clase_id" uuid NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"titulo" text NOT NULL,
	"contenido_md" text NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etiqueta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "etiqueta_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "modulo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"orden_sugerido" integer NOT NULL,
	CONSTRAINT "modulo_curso_id_slug_unique" UNIQUE("curso_id","slug")
);
--> statement-breakpoint
CREATE TABLE "modulo_etiqueta" (
	"modulo_id" uuid NOT NULL,
	"etiqueta_id" uuid NOT NULL,
	"peso" numeric(3, 2) DEFAULT 1 NOT NULL,
	CONSTRAINT "modulo_etiqueta_modulo_id_etiqueta_id_pk" PRIMARY KEY("modulo_id","etiqueta_id"),
	CONSTRAINT "modulo_etiqueta_peso_check" CHECK ("modulo_etiqueta"."peso" > 0 AND "modulo_etiqueta"."peso" <= 1)
);
--> statement-breakpoint
CREATE TABLE "matricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"email" text NOT NULL,
	"usuario_id" uuid,
	"rol_en_curso" "rol_en_curso" DEFAULT 'alumno' NOT NULL,
	"origen" "origen_matricula" NOT NULL,
	"pedido_id" uuid,
	"modulo_principal_id" uuid,
	"orden_modulos" uuid[],
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matricula_curso_id_email_unique" UNIQUE("curso_id","email"),
	CONSTRAINT "matricula_email_check" CHECK ("matricula"."email" = lower("matricula"."email")),
	CONSTRAINT "matricula_pedido_check" CHECK (("matricula"."origen" = 'compra') = ("matricula"."pedido_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pedido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL,
	"importe_centimos" integer NOT NULL,
	"moneda" text DEFAULT 'eur' NOT NULL,
	"estado" "estado_pedido" DEFAULT 'pendiente' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent" text,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"pagado_en" timestamp with time zone,
	CONSTRAINT "pedido_stripe_session_id_unique" UNIQUE("stripe_session_id"),
	CONSTRAINT "pedido_importe_centimos_check" CHECK ("pedido"."importe_centimos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "material_clase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clase_id" uuid NOT NULL,
	"tipo" "tipo_material" NOT NULL,
	"contenido" jsonb NOT NULL,
	"modelo" text NOT NULL,
	"revisado" boolean DEFAULT false NOT NULL,
	"generado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_clase_clase_id_tipo_unique" UNIQUE("clase_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "material_personal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"modulo_id" uuid NOT NULL,
	"concepto_id" uuid,
	"tipo" "tipo_material_personal" NOT NULL,
	"nivel" "nivel_material" DEFAULT 'normal' NOT NULL,
	"enfoque" text,
	"contenido" jsonb NOT NULL,
	"generado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_personal_enfoque_check" CHECK (char_length("material_personal"."enfoque") <= 200)
);
--> statement-breakpoint
CREATE TABLE "ejercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"concepto_id" uuid NOT NULL,
	"clase_id" uuid NOT NULL,
	"segundo_referencia" integer DEFAULT 0 NOT NULL,
	"tipo" "tipo_ejercicio" NOT NULL,
	"enunciado" text NOT NULL,
	"opciones" jsonb,
	"solucion" jsonb,
	"rubrica" text,
	"estado" "estado_ejercicio" DEFAULT 'borrador' NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"ejercicio_id" uuid NOT NULL,
	"respuesta" jsonb NOT NULL,
	"puntuacion" numeric(3, 2) NOT NULL,
	"correcto" boolean NOT NULL,
	"feedback" text NOT NULL,
	"repasar_clase_id" uuid,
	"repasar_segundo" integer,
	"revision_humana" boolean DEFAULT false NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intento_puntuacion_check" CHECK ("intento"."puntuacion" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE TABLE "plantilla_ejercicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modulo_id" uuid NOT NULL,
	"tipos" "tipo_ejercicio"[] NOT NULL,
	"ejemplos" jsonb NOT NULL,
	"indicaciones" text,
	CONSTRAINT "plantilla_ejercicio_modulo_id_unique" UNIQUE("modulo_id")
);
--> statement-breakpoint
CREATE TABLE "progreso" (
	"usuario_id" uuid NOT NULL,
	"modulo_id" uuid NOT NULL,
	"estado" "estado_modulo" DEFAULT 'pendiente' NOT NULL,
	"aciertos_por_concepto" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progreso_usuario_id_modulo_id_pk" PRIMARY KEY("usuario_id","modulo_id")
);
--> statement-breakpoint
CREATE TABLE "evaluacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curso_id" uuid NOT NULL,
	"modulo_id" uuid,
	"tipo" "tipo_evaluacion" NOT NULL,
	"titulo" text NOT NULL,
	"nota_aprobado" numeric(5, 2),
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluacion_nota_aprobado_check" CHECK ("evaluacion"."tipo" = 'diagnostico' OR "evaluacion"."nota_aprobado" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "intento_evaluacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"evaluacion_id" uuid NOT NULL,
	"respuestas" jsonb NOT NULL,
	"nota" numeric(5, 2),
	"aprobado" boolean,
	"porcentajes_etiquetas" jsonb,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pregunta_evaluacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluacion_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"tipo" "tipo_ejercicio" NOT NULL,
	"enunciado" text NOT NULL,
	"opciones" jsonb,
	"solucion" jsonb,
	"rubrica" text,
	"puntos" numeric(5, 2) DEFAULT 1 NOT NULL,
	CONSTRAINT "pregunta_evaluacion_evaluacion_id_orden_unique" UNIQUE("evaluacion_id","orden")
);
--> statement-breakpoint
CREATE TABLE "conversacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"modulo_id" uuid NOT NULL,
	"creada" timestamp with time zone DEFAULT now() NOT NULL,
	"caduca" timestamp with time zone DEFAULT now() + interval '90 days' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"rol" "rol_mensaje" NOT NULL,
	"texto" text NOT NULL,
	"fuentes" jsonb,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uso_ia" (
	"usuario_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "uso_ia_usuario_id_dia_pk" PRIMARY KEY("usuario_id","dia")
);
--> statement-breakpoint
CREATE TABLE "comentario_foro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tema_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"respuesta_a_id" uuid,
	"cuerpo" text NOT NULL,
	"validacion" "validacion_foro" DEFAULT 'pendiente' NOT NULL,
	"validado_por" "validador_foro",
	"profesor_id" uuid,
	"validado_en" timestamp with time zone,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comentario_foro_validacion_check" CHECK (("comentario_foro"."validacion" = 'pendiente') = ("comentario_foro"."validado_por" IS NULL AND "comentario_foro"."validado_en" IS NULL)),
	CONSTRAINT "comentario_foro_profesor_check" CHECK ("comentario_foro"."profesor_id" IS NULL OR "comentario_foro"."validado_por" = 'profesor')
);
--> statement-breakpoint
CREATE TABLE "insignia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text NOT NULL,
	"icono_url" text,
	"criterio" jsonb NOT NULL,
	CONSTRAINT "insignia_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tema_foro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clase_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"cuerpo" text NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuario_insignia" (
	"usuario_id" uuid NOT NULL,
	"insignia_id" uuid NOT NULL,
	"obtenida" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_insignia_usuario_id_insignia_id_pk" PRIMARY KEY("usuario_id","insignia_id")
);
--> statement-breakpoint
ALTER TABLE "cuenta" ADD CONSTRAINT "cuenta_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clase" ADD CONSTRAINT "clase_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curso" ADD CONSTRAINT "curso_categoria_id_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categoria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curso_imagen" ADD CONSTRAINT "curso_imagen_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo" ADD CONSTRAINT "modulo_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo_etiqueta" ADD CONSTRAINT "modulo_etiqueta_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modulo_etiqueta" ADD CONSTRAINT "modulo_etiqueta_etiqueta_id_etiqueta_id_fk" FOREIGN KEY ("etiqueta_id") REFERENCES "public"."etiqueta"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_pedido_id_pedido_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedido"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matricula" ADD CONSTRAINT "matricula_modulo_principal_id_modulo_id_fk" FOREIGN KEY ("modulo_principal_id") REFERENCES "public"."modulo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_clase" ADD CONSTRAINT "material_clase_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_personal" ADD CONSTRAINT "material_personal_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_personal" ADD CONSTRAINT "material_personal_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_personal" ADD CONSTRAINT "material_personal_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_concepto_id_concepto_id_fk" FOREIGN KEY ("concepto_id") REFERENCES "public"."concepto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ejercicio" ADD CONSTRAINT "ejercicio_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intento" ADD CONSTRAINT "intento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intento" ADD CONSTRAINT "intento_ejercicio_id_ejercicio_id_fk" FOREIGN KEY ("ejercicio_id") REFERENCES "public"."ejercicio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intento" ADD CONSTRAINT "intento_repasar_clase_id_clase_id_fk" FOREIGN KEY ("repasar_clase_id") REFERENCES "public"."clase"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantilla_ejercicio" ADD CONSTRAINT "plantilla_ejercicio_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progreso" ADD CONSTRAINT "progreso_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progreso" ADD CONSTRAINT "progreso_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_curso_id_curso_id_fk" FOREIGN KEY ("curso_id") REFERENCES "public"."curso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluacion" ADD CONSTRAINT "evaluacion_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intento_evaluacion" ADD CONSTRAINT "intento_evaluacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intento_evaluacion" ADD CONSTRAINT "intento_evaluacion_evaluacion_id_evaluacion_id_fk" FOREIGN KEY ("evaluacion_id") REFERENCES "public"."evaluacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pregunta_evaluacion" ADD CONSTRAINT "pregunta_evaluacion_evaluacion_id_evaluacion_id_fk" FOREIGN KEY ("evaluacion_id") REFERENCES "public"."evaluacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacion_id_conversacion_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_ia" ADD CONSTRAINT "uso_ia_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_foro" ADD CONSTRAINT "comentario_foro_tema_id_tema_foro_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema_foro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_foro" ADD CONSTRAINT "comentario_foro_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_foro" ADD CONSTRAINT "comentario_foro_respuesta_a_id_comentario_foro_id_fk" FOREIGN KEY ("respuesta_a_id") REFERENCES "public"."comentario_foro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario_foro" ADD CONSTRAINT "comentario_foro_profesor_id_usuario_id_fk" FOREIGN KEY ("profesor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tema_foro" ADD CONSTRAINT "tema_foro_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tema_foro" ADD CONSTRAINT "tema_foro_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_insignia" ADD CONSTRAINT "usuario_insignia_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_insignia" ADD CONSTRAINT "usuario_insignia_insignia_id_insignia_id_fk" FOREIGN KEY ("insignia_id") REFERENCES "public"."insignia"("id") ON DELETE cascade ON UPDATE no action;