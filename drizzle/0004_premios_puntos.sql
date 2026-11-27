CREATE TYPE "public"."tipo_movimiento_puntos" AS ENUM('canje', 'demo');--> statement-breakpoint
CREATE TABLE "movimiento_puntos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_movimiento_puntos" NOT NULL,
	"premio" text,
	"puntos" integer NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimiento_puntos_tipo_check" CHECK (("movimiento_puntos"."tipo" = 'canje' AND "movimiento_puntos"."premio" IS NOT NULL AND "movimiento_puntos"."puntos" < 0) OR ("movimiento_puntos"."tipo" = 'demo' AND "movimiento_puntos"."premio" IS NULL AND "movimiento_puntos"."puntos" > 0))
);
--> statement-breakpoint
ALTER TABLE "movimiento_puntos" ADD CONSTRAINT "movimiento_puntos_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "movimiento_puntos_canje_unique" ON "movimiento_puntos" USING btree ("usuario_id","premio") WHERE "movimiento_puntos"."premio" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "movimiento_puntos_usuario_idx" ON "movimiento_puntos" USING btree ("usuario_id");