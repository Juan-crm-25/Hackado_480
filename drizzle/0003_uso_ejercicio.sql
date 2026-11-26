CREATE TYPE "public"."uso_ejercicio" AS ENUM('video', 'modulo', 'examen');--> statement-breakpoint
ALTER TABLE "ejercicio" ADD COLUMN "uso" "uso_ejercicio" DEFAULT 'modulo' NOT NULL;