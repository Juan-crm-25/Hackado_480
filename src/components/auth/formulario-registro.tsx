"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BotonesSociales } from "./botones-sociales";
import { Campo, CampoContrasena, ErrorFormulario, rutaConVolver, useEnvioAuth } from "./campos";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

/** Registro simulado (issue #42): crea una cuenta de alumno en la BBDD y deja la sesión iniciada. */
export function FormularioRegistro() {
  const { enviar, enviando, error, volver } = useEnvioAuth("/api/auth/registro");

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) =>
          enviar(e, (datos) => ({
            nombre: texto(datos, "registro-nombre"),
            email: texto(datos, "registro-email"),
            contrasena: texto(datos, "registro-contrasena"),
          }))
        }
      >
        <Campo id="registro-nombre" etiqueta="Nombre" autoComplete="name" placeholder="Tu nombre y apellidos" minLength={2} required />
        <Campo id="registro-email" etiqueta="Email" type="email" autoComplete="email" placeholder="tu@email.com" required />
        <div className="flex flex-col gap-2">
          <CampoContrasena
            id="registro-contrasena"
            autoComplete="new-password"
            minLength={8}
            aria-describedby="registro-contrasena-ayuda"
            required
          />
          <p id="registro-contrasena-ayuda" className="text-sm text-muted-foreground">
            Al menos 8 caracteres.
          </p>
        </div>

        <ErrorFormulario error={error} />

        <Button type="submit" variant="accent" size="lg" disabled={enviando}>
          {enviando ? "Creando tu cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <BotonesSociales texto="o regístrate con" />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={rutaConVolver("/login", volver)}
          className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
