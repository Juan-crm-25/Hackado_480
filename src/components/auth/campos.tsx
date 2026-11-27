"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { EstadoError } from "@/components/estado";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { destinoTrasLogin, entrarConSesionNueva } from "@/lib/destino";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";

/** Etiqueta + campo, con el espacio de la guía entre los dos. */
export function Campo({ id, etiqueta, ...props }: { id: string; etiqueta: string } & ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} name={id} {...props} />
    </div>
  );
}

/** Campo de contraseña con el botón «Mostrar / Ocultar» (44 px, dentro del campo). */
export function CampoContrasena({
  id,
  etiqueta = "Contraseña",
  ...props
}: { id: string; etiqueta?: string } & ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  const Icono = visible ? EyeOff : Eye;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <Input id={id} name={id} type={visible ? "text" : "password"} className="pr-12" {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Icono className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** `?volver=` actual, para conservarlo al pasar del login al registro y al revés. */
export function useVolver(): string | null {
  return useSearchParams().get("volver");
}

/** Enlace a otra pantalla de acceso que conserva `?volver=`. */
export function rutaConVolver(ruta: string, volver: string | null): string {
  return volver ? `${ruta}?${new URLSearchParams({ volver })}` : ruta;
}

/**
 * Envía el formulario a la API de auth. Si va bien, la cookie ya está puesta: se carga el destino de cero
 * (`?volver=` o «Tus cursos»; ver `entrarConSesionNueva`), así el layout ya muestra al usuario.
 *
 * Next 16 (Cache Components) no desmonta la página al salir: la oculta con <Activity> y conserva su estado y
 * lo escrito en los campos. Por eso, al ocultarse, se reinicia el envío y se vacía el formulario
 * (docs de Next: «Preserving UI state», «Resetting stale status messages»). Si no, al cerrar sesión y volver,
 * el botón seguía en «Entrando…» y la contraseña seguía escrita.
 */
export function useEnvioAuth(url: string) {
  const volver = useVolver();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  useLayoutEffect(() => {
    const form = formulario.current;
    return () => {
      setEnviando(false);
      setError(null);
      form?.reset();
    };
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>, cuerpo: (datos: FormData) => Record<string, string>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo(new FormData(evento.currentTarget))),
      });
      await leerRespuesta(res);
      entrarConSesionNueva(destinoTrasLogin(volver));
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  }

  return { enviar, enviando, error, volver, formulario };
}

export function ErrorFormulario({ error }: { error: string | null }) {
  return error ? <EstadoError>{error}</EstadoError> : null;
}
