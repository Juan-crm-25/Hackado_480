"use client";

import { Clock, UserCheck } from "lucide-react";
import { useState } from "react";
import { EstadoError, EstadoVacio } from "@/components/estado";
import { TextoConCodigo } from "@/components/fuente-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { DudaHumanaProfesor } from "@/lib/types";
import { haceCuanto } from "./hace-cuanto";

const MAX_RESPUESTA = 2000;

/**
 * Dudas que los alumnos han pasado a un tutor humano (H9), para que el profesor las responda desde el Radar.
 * La respuesta la escribe él, sin IA, y el alumno la ve en su chat como «Respondido por tu tutor».
 */
export function DudasParaResponder({ dudasIniciales, ahora }: { dudasIniciales: DudaHumanaProfesor[] | null; ahora: Date }) {
  const [dudas, setDudas] = useState(dudasIniciales);
  const pendientes = dudas?.filter((d) => d.estado === "pendiente").length ?? 0;

  return (
    <section aria-labelledby="te-han-pedido-ayuda" className="flex flex-col gap-3">
      <h2 id="te-han-pedido-ayuda" className="text-2xl leading-tight font-bold">
        Te han pedido ayuda ({pendientes})
      </h2>
      <p className="text-sm text-muted-foreground">Dudas que el tutor IA no resolvió y los alumnos te han pasado. Tu respuesta les llega a su chat.</p>
      {dudas === null ? (
        <EstadoError>No se han podido cargar las dudas que te han pasado. Recarga la página.</EstadoError>
      ) : dudas.length === 0 ? (
        <EstadoVacio>Ningún alumno te ha pasado dudas. Cuando el tutor IA no les baste, aparecerán aquí.</EstadoVacio>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {dudas.map((d) => (
            <li key={d.id}>
              <TarjetaDuda duda={d} ahora={ahora} onRespondida={(nueva) => setDudas((prev) => prev!.map((x) => (x.id === nueva.id ? nueva : x)))} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaDuda({ duda, ahora, onRespondida }: { duda: DudaHumanaProfesor; ahora: Date; onRespondida: (d: DudaHumanaProfesor) => void }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idCampo = `respuesta-${duda.id}`;

  async function responder() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/radar/dudas/${encodeURIComponent(duda.id)}/respuesta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respuesta: texto }),
      });
      onRespondida(await leerRespuesta<DudaHumanaProfesor>(res));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="flex h-full flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-bold break-words">{duda.alumno}</h3>
        {duda.estado === "pendiente" ? (
          <Badge variant="secondary" className="shrink-0">
            <Clock aria-hidden />
            Pendiente
          </Badge>
        ) : (
          <Badge className="shrink-0">
            <UserCheck aria-hidden />
            Respondida
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {duda.modulo} · {haceCuanto(new Date(duda.creada), ahora)}
      </p>
      <p className="text-sm break-words">
        <TextoConCodigo texto={duda.pregunta} />
      </p>

      {duda.estado === "respondida" ? (
        <p className="rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
          <TextoConCodigo texto={duda.respuesta ?? ""} />
        </p>
      ) : (
        <form
          className="mt-auto flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            responder();
          }}
        >
          <label htmlFor={idCampo} className="text-sm font-medium">
            Tu respuesta
          </label>
          <Textarea id={idCampo} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={MAX_RESPUESTA} className="resize-none" />
          <Button type="submit" disabled={enviando || !texto.trim()} className="self-start">
            {enviando ? "Enviando…" : "Responder"}
          </Button>
          {error && <EstadoError>{error}</EstadoError>}
        </form>
      )}
    </article>
  );
}
