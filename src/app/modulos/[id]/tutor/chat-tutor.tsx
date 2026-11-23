"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ALUMNO_DEMO_ID, enlaceYoutube, formatoMinuto } from "@/lib/formato";
import type { ErrorApi, Mensaje, PeticionTutor, RespuestaTutor } from "@/lib/types";

interface VideoResumen {
  id: string;
  titulo: string;
  youtubeId: string;
}

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
    finRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const mensaje = e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Sin conexión. Inténtalo de nuevo.";
      setMensajes((prev) => [...prev, { rol: "tutor", texto: mensaje, error: true }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {mensajes.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Pregúntame lo que quieras sobre este módulo. Solo respondo con lo que se explica en sus vídeos, y te digo en qué
              minuto está.
            </p>
            <div className="flex flex-wrap gap-2">
              {sugerencias.map((s) => (
                <Button key={s} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => enviar(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <BurbujaMensaje key={i} mensaje={m} videos={videos} />
        ))}

        {enviando && <p className="text-sm text-muted-foreground">El tutor está escribiendo…</p>}
        <div ref={finRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
        <Button type="submit" className="h-11" disabled={enviando || !texto.trim()}>
          Enviar
        </Button>
      </form>
    </>
  );
}

function BurbujaMensaje({ mensaje, videos }: { mensaje: Burbuja; videos: VideoResumen[] }) {
  const esAlumno = mensaje.rol === "alumno";
  const estilo = esAlumno
    ? "self-end bg-primary text-primary-foreground"
    : mensaje.error
      ? "self-start border border-destructive/40 bg-destructive/10 text-destructive"
      : mensaje.fueraDeTemario
        ? "self-start bg-muted text-muted-foreground"
        : "self-start bg-muted";

  return (
    <div className={`flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${estilo}`}>
      <p>
        {/* Los trozos entre `comillas invertidas` son código: se muestran en monoespaciada. */}
        {mensaje.texto.split("`").map((trozo, i) =>
          i % 2 === 1 ? (
            <code key={i} className="rounded bg-background/60 px-1 font-mono text-[0.9em]">
              {trozo}
            </code>
          ) : (
            trozo
          ),
        )}
      </p>
      {!!mensaje.fuentes?.length && (
        <ul className="flex flex-wrap gap-2">
          {mensaje.fuentes.map((f) => {
            const video = videos.find((v) => v.id === f.videoId);
            const etiqueta = `▶ ${video?.titulo ?? f.videoId} · ${formatoMinuto(f.segundo)}`;
            const href = video ? enlaceYoutube(video.youtubeId, f.segundo) : null;
            return (
              <li key={`${f.videoId}-${f.segundo}`}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border bg-background px-3 py-1 text-xs">
                    {etiqueta}
                  </a>
                ) : (
                  <span className="inline-block rounded-full border bg-background px-3 py-1 text-xs" title="El vídeo aún no tiene enlace">
                    {etiqueta}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
