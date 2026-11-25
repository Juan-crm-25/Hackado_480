"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BotonesSociales } from "./botones-sociales";
import { Campo, CampoContrasena, ErrorFormulario, rutaConVolver, useEnvioAuth } from "./campos";

const texto = (datos: FormData, campo: string) => String(datos.get(campo) ?? "");

/** Login simulado (issue #42): email y contraseña contra la BBDD. Lo social y «he olvidado» son decorativos. */
export function FormularioLogin() {
  const { enviar, enviando, error, volver } = useEnvioAuth("/api/auth/login");

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) =>
          enviar(e, (datos) => ({ email: texto(datos, "login-email"), contrasena: texto(datos, "login-contrasena") }))
        }
      >
        <Campo id="login-email" etiqueta="Email" type="email" autoComplete="email" placeholder="tu@email.com" required />
        <CampoContrasena id="login-contrasena" autoComplete="current-password" required />

        {/* Decorativo en la demo: no lleva a ninguna parte. */}
        <button
          type="button"
          className="-my-2 inline-flex min-h-11 items-center self-end rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        >
          ¿Has olvidado tu contraseña?
        </button>

        <ErrorFormulario error={error} />

        <Button type="submit" variant="accent" size="lg" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <BotonesSociales />

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href={rutaConVolver("/registro", volver)}
          className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          Crea una gratis
        </Link>
      </p>
    </div>
  );
}
