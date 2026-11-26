"use client";

import { Plus, Send } from "lucide-react";
import { useEffect, useId, useRef, type FormEvent } from "react";
import { EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * «Nueva duda»: plegada es un botón; al pulsarlo se despliega el formulario (título y texto).
 * El contenedor decide si está abierta, envía y, si va bien, la vuelve a plegar.
 */
export function FormularioDuda({
  abierto,
  onAbrir,
  onCancelar,
  enviando,
  error,
  onEnviar,
}: {
  abierto: boolean;
  onAbrir: () => void;
  onCancelar: () => void;
  enviando: boolean;
  error: string | null;
  onEnviar: (datos: { titulo: string; cuerpo: string }, formulario: HTMLFormElement) => void;
}) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const titulo = useRef<HTMLInputElement>(null);
  const estabaAbierto = useRef(abierto);

  // Al abrir, el foco va al título; al plegar, vuelve al botón «Nueva duda».
  useEffect(() => {
    if (abierto && !estabaAbierto.current) titulo.current?.focus();
    if (!abierto && estabaAbierto.current) boton.current?.focus();
    estabaAbierto.current = abierto;
  }, [abierto]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    onEnviar({ titulo: String(datos.get("titulo") ?? ""), cuerpo: String(datos.get("cuerpo") ?? "") }, evento.currentTarget);
  }

  if (!abierto) {
    return (
      <div>
        <Button ref={boton} type="button" variant="accent" aria-expanded={false} aria-controls={`${id}-formulario`} onClick={onAbrir}>
          <Plus aria-hidden />
          Nueva duda
        </Button>
      </div>
    );
  }

  return (
    <form
      id={`${id}-formulario`}
      onSubmit={enviar}
      aria-labelledby={`${id}-titulo-form`}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300"
    >
      <h3 id={`${id}-titulo-form`} className="text-base font-bold">
        Nueva duda
      </h3>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-titulo`}>Título</Label>
        <Input
          ref={titulo}
          id={`${id}-titulo`}
          name="titulo"
          required
          minLength={3}
          maxLength={150}
          placeholder="Resume tu duda en una frase"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-cuerpo`}>Tu duda</Label>
        <Textarea id={`${id}-cuerpo`} name="cuerpo" required maxLength={5000} rows={4} placeholder="Cuenta qué has probado y dónde te atascas" />
      </div>
      {error && <EstadoError>{error}</EstadoError>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="accent" disabled={enviando}>
          <Send aria-hidden />
          {enviando ? "Publicando…" : "Publicar duda"}
        </Button>
        <Button type="button" variant="ghost" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
