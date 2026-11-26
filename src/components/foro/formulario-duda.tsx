"use client";

import { Send } from "lucide-react";
import { useId, type FormEvent } from "react";
import { EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** «Nueva duda»: título y texto. El contenedor envía y, si va bien, vacía el formulario. */
export function FormularioDuda({
  enviando,
  error,
  onEnviar,
}: {
  enviando: boolean;
  error: string | null;
  onEnviar: (datos: { titulo: string; cuerpo: string }, formulario: HTMLFormElement) => void;
}) {
  const id = useId();

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    onEnviar({ titulo: String(datos.get("titulo") ?? ""), cuerpo: String(datos.get("cuerpo") ?? "") }, evento.currentTarget);
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="text-base font-bold">Nueva duda</h3>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-titulo`}>Título</Label>
        <Input id={`${id}-titulo`} name="titulo" required minLength={3} maxLength={150} placeholder="Resume tu duda en una frase" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-cuerpo`}>Tu duda</Label>
        <Textarea id={`${id}-cuerpo`} name="cuerpo" required maxLength={5000} rows={4} placeholder="Cuenta qué has probado y dónde te atascas" />
      </div>
      {error && <EstadoError>{error}</EstadoError>}
      <div>
        <Button type="submit" variant="accent" disabled={enviando}>
          <Send aria-hidden />
          {enviando ? "Publicando…" : "Publicar duda"}
        </Button>
      </div>
    </form>
  );
}
