"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EstadoCargando, EstadoVacio } from "@/components/estado";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ALUMNO_DEMO_ID } from "@/lib/formato";
import { mensajeDeError } from "@/lib/peticiones";
import type { ErrorApi, Mensaje, PeticionTutor, RespuestaTutor } from "@/lib/types";

type Burbuja = Mensaje & { fueraDeTemario?: boolean; error?: boolean };

export function ChatTutor({
  moduloId,
  videos,
  sugerencias,
}: {
  moduloId: string;
  videos: VideoResumen[];
  sugerencias: string[];
}) {
  const [mensajes, setMensajes] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [restantes, setRestantes] = useState<number | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    finRef.current?.scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
  }, [mensajes, enviando]);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || enviando) return;

    const historial = mensajes.filter((m) => !m.error).map(({ rol, texto }) => ({ rol, texto }));
    setMensajes((prev) => [...prev, { rol: "alumno", texto: limpia }]);
    setTexto("");
    setEnviando(true);

    try {
      const peticion: PeticionTutor = { alumnoId: ALUMNO_DEMO_ID, moduloId, mensaje: limpia, historial };
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peticion),
      });
      const datos = (await res.json()) as RespuestaTutor | ErrorApi;
      if (!res.ok || "error" in datos) {
        throw new Error("error" in datos ? datos.error : "Error inesperado");
      }
      setMensajes((prev) => [...prev, { ...datos.mensaje, fueraDeTemario: datos.fueraDeTemario }]);
      if (typeof datos.consultasRestantes === "number") setRestantes(datos.consultasRestantes);
    } catch (e) {
      setMensajes((prev) => [...prev, { rol: "tutor", texto: mensajeDeError(e), error: true }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {mensajes.length === 0 && (
          <EstadoVacio
            acciones={
              <div className="flex flex-wrap gap-2">
                {sugerencias.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="h-auto min-h-11 py-2 text-left whitespace-normal"
                    onClick={() => enviar(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            }
          >
            Pregúntame lo que quieras sobre este módulo. Solo respondo con lo que se explica en sus vídeos, y te digo en qué
            minuto está.
          </EstadoVacio>
        )}

        {/* Solo la conversación es región viva (role="log"): se anuncian los mensajes nuevos, no toda la pantalla. */}
        <div role="log" aria-label="Conversación con el tutor" className="flex flex-col gap-3">
          {mensajes.map((m, i) => (
            <BurbujaMensaje key={i} mensaje={m} videos={videos} />
          ))}
        </div>

        {enviando && <EstadoCargando texto="El tutor está escribiendo…" />}
        <div ref={finRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t bg-background px-4 pt-3 pb-3 lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            placeholder="Escribe tu duda…"
            rows={1}
            maxLength={1000}
            className="max-h-32 min-h-11 resize-none"
            aria-label="Tu pregunta"
          />
          {restantes !== null && <p className="text-xs text-muted-foreground">Te quedan {restantes} preguntas hoy</p>}
        </div>
        <Button type="submit" variant="accent" disabled={enviando || !texto.trim()}>
          Enviar
        </Button>
      </form>
    </>
  );
}

export function BurbujaMensaje({ mensaje, videos }: { mensaje: Burbuja; videos: VideoResumen[] }) {
  const esAlumno = mensaje.rol === "alumno";
  const estilo = esAlumno
    ? "self-end bg-primary text-primary-foreground"
    : mensaje.error
      ? "self-start border border-destructive/40 bg-destructive/10 text-destructive"
      : mensaje.fueraDeTemario
        ? "self-start bg-muted text-muted-foreground"
        : "self-start bg-muted";

  return (
    <div className={`flex max-w-[85%] flex-col gap-2 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${estilo}`}>
      {/* Marca con texto e icono (no solo con color) las respuestas fuera del temario. */}
      {!esAlumno && !mensaje.error && mensaje.fueraDeTemario && (
        <p className="flex items-center gap-1 text-xs font-semibold">
          <Info className="size-3.5 shrink-0" aria-hidden />
          Fuera del temario
        </p>
      )}
      <p>
        {/* Los trozos entre `comillas invertidas` son código: se muestran en monoespaciada. */}
        <TextoConCodigo texto={mensaje.texto} />
      </p>
      {!!mensaje.fuentes?.length && (
        <ul className="flex flex-wrap gap-2">
          {mensaje.fuentes.map((f) => (
            <li key={`${f.videoId}-${f.segundo}`}>
              <FuenteVideo fuente={f} videos={videos} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
