CREATE TABLE "duda_humana" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mensaje_id" uuid NOT NULL,
	"creada" timestamp with time zone DEFAULT now() NOT NULL,
	"respuesta" text,
	"respondida_por" uuid,
	"respondida" timestamp with time zone,
	CONSTRAINT "duda_humana_mensaje_id_unique" UNIQUE("mensaje_id"),
	CONSTRAINT "duda_humana_respuesta_check" CHECK (("duda_humana"."respuesta" IS NULL) = ("duda_humana"."respondida" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "duda_humana" ADD CONSTRAINT "duda_humana_mensaje_id_mensaje_id_fk" FOREIGN KEY ("mensaje_id") REFERENCES "public"."mensaje"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duda_humana" ADD CONSTRAINT "duda_humana_respondida_por_usuario_id_fk" FOREIGN KEY ("respondida_por") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;