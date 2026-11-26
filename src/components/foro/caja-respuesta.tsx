"use client";

import { Send } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Caja para comentar en el hilo o responder a un comentario. Se vacía cuando el envío va bien. */
export function CajaRespuesta({
  etiqueta,
  boton,
  destacada = false,
  ocupado,
  onEnviar,
  onCancelar,
}: {
  etiqueta: string;
  boton: string;
  /** La caja principal del hilo lleva el botón `accent`; las de responder, no. */
  destacada?: boolean;
  ocupado: boolean;
  /** Devuelve true si se ha guardado. */
  onEnviar: (cuerpo: string) => Promise<boolean>;
  onCancelar?: () => void;
}) {
  const id = useId();
  const [cuerpo, setCuerpo] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!cuerpo.trim()) return;
    if (await onEnviar(cuerpo)) setCuerpo("");
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Textarea id={id} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} maxLength={5000} required rows={3} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant={destacada ? "accent" : "default"} disabled={ocupado || !cuerpo.trim()}>
          <Send aria-hidden />
          {ocupado ? "Enviando…" : boton}
        </Button>
        {onCancelar && (
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
