CREATE TYPE "public"."motivo_punto_foro" AS ENUM('buena_pregunta', 'buena_conducta');--> statement-breakpoint
CREATE TABLE "punto_foro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profesor_id" uuid,
	"alumno_id" uuid NOT NULL,
	"tema_id" uuid,
	"comentario_id" uuid,
	"puntos" integer NOT NULL,
	"motivo" "motivo_punto_foro" NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "punto_foro_tema_unique" UNIQUE("tema_id"),
	CONSTRAINT "punto_foro_comentario_unique" UNIQUE("comentario_id"),
	CONSTRAINT "punto_foro_puntos_check" CHECK ("punto_foro"."puntos" IN (1, 3, 6)),
	CONSTRAINT "punto_foro_destino_check" CHECK (("punto_foro"."tema_id" IS NULL) <> ("punto_foro"."comentario_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "tema_foro" DROP CONSTRAINT "tema_foro_clase_id_clase_id_fk";
--> statement-breakpoint
-- La restricción compara con el enum antiguo: se quita mientras se cambia el tipo y se vuelve a crear al final.
ALTER TABLE "comentario_foro" DROP CONSTRAINT "comentario_foro_validacion_check";--> statement-breakpoint
ALTER TABLE "comentario_foro" ALTER COLUMN "validacion" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "comentario_foro" ALTER COLUMN "validacion" SET DEFAULT 'pendiente'::text;--> statement-breakpoint
-- Valores antiguos (si hubiera filas): buena → correcta, no_util → no_respuesta. La validación sigue siendo coherente.
UPDATE "comentario_foro" SET "validacion" = CASE "validacion" WHEN 'buena' THEN 'correcta' WHEN 'no_util' THEN 'no_respuesta' ELSE "validacion" END;--> statement-breakpoint
DROP TYPE "public"."validacion_foro";--> statement-breakpoint
CREATE TYPE "public"."validacion_foro" AS ENUM('pendiente', 'correcta', 'aproximada', 'incorrecta', 'no_respuesta');--> statement-breakpoint
ALTER TABLE "comentario_foro" ALTER COLUMN "validacion" SET DEFAULT 'pendiente'::"public"."validacion_foro";--> statement-breakpoint
ALTER TABLE "comentario_foro" ALTER COLUMN "validacion" SET DATA TYPE "public"."validacion_foro" USING "validacion"::"public"."validacion_foro";--> statement-breakpoint
ALTER TABLE "comentario_foro" ADD CONSTRAINT "comentario_foro_validacion_check" CHECK (("comentario_foro"."validacion" = 'pendiente') = ("comentario_foro"."validado_por" IS NULL AND "comentario_foro"."validado_en" IS NULL));--> statement-breakpoint
ALTER TABLE "tema_foro" ALTER COLUMN "clase_id" DROP NOT NULL;--> statement-breakpoint
-- El foro pasa a ser por módulo: los temas que existieran toman el módulo de su clase.
ALTER TABLE "tema_foro" ADD COLUMN "modulo_id" uuid;--> statement-breakpoint
UPDATE "tema_foro" AS t SET "modulo_id" = c."modulo_id" FROM "clase" AS c WHERE c."id" = t."clase_id";--> statement-breakpoint
ALTER TABLE "tema_foro" ALTER COLUMN "modulo_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "punto_foro" ADD CONSTRAINT "punto_foro_profesor_id_usuario_id_fk" FOREIGN KEY ("profesor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punto_foro" ADD CONSTRAINT "punto_foro_alumno_id_usuario_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punto_foro" ADD CONSTRAINT "punto_foro_tema_id_tema_foro_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."tema_foro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punto_foro" ADD CONSTRAINT "punto_foro_comentario_id_comentario_foro_id_fk" FOREIGN KEY ("comentario_id") REFERENCES "public"."comentario_foro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tema_foro" ADD CONSTRAINT "tema_foro_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tema_foro" ADD CONSTRAINT "tema_foro_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE set null ON UPDATE no action;