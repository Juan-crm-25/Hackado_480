"use client";

import { Clock, Info, UserCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EstadoCargando, EstadoVacio } from "@/components/estado";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { TextoMarkdown } from "@/components/texto-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { DudaHumana, ErrorApi, Mensaje, PeticionTutor, RespuestaTutor } from "@/lib/types";
import { contar } from "@/lib/formato";

type Burbuja = Mensaje & {
  fueraDeTemario?: boolean;
  error?: boolean;
  /** Pregunta guardada a la que responde: permite pasarla a un tutor humano (H9). */
  preguntaId?: string;
  /** Estado del envío al tutor humano: un mensaje de texto si falló. */
  pasada?: "enviando" | "enviada" | { error: string };
};

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
  const [dudas, setDudas] = useState<DudaHumana[]>([]);
  const finRef = useRef<HTMLDivElement>(null);

  // Dudas que el alumno ya pasó a su tutor en este módulo, con la respuesta cuando la hay (H9).
  useEffect(() => {
    fetch(`/api/tutor/humano?modulo=${encodeURIComponent(moduloId)}`)
      .then((res) => leerRespuesta<DudaHumana[]>(res))
      .then(setDudas)
      .catch(() => {}); // Si falla, el chat sigue funcionando: solo no se ven las respuestas del tutor.
  }, [moduloId]);

  async function pasarATutor(indice: number, preguntaId: string) {
    setMensajes((prev) => prev.map((m, i) => (i === indice ? { ...m, pasada: "enviando" } : m)));
    try {
      const res = await fetch("/api/tutor/humano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId }),
      });
      const duda = await leerRespuesta<DudaHumana>(res);
      setDudas((prev) => [...prev.filter((d) => d.id !== duda.id), duda]);
      setMensajes((prev) => prev.map((m, i) => (i === indice ? { ...m, pasada: "enviada" } : m)));
    } catch (e) {
      setMensajes((prev) => prev.map((m, i) => (i === indice ? { ...m, pasada: { error: mensajeDeError(e) } } : m)));
    }
  }

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
      // El alumno lo pone el servidor a partir de la sesión.
      const peticion: PeticionTutor = { moduloId, mensaje: limpia, historial };
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peticion),
      });
      const datos = (await res.json()) as RespuestaTutor | ErrorApi;
      if (!res.ok || "error" in datos) {
        throw new Error("error" in datos ? datos.error : "Error inesperado");
      }
      setMensajes((prev) => [...prev, { ...datos.mensaje, fueraDeTemario: datos.fueraDeTemario, preguntaId: datos.preguntaId }]);
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
        <DudasConTutor dudas={dudas} />
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
            <BurbujaMensaje key={i} mensaje={m} videos={videos} onPasarATutor={m.preguntaId ? () => pasarATutor(i, m.preguntaId!) : undefined} />
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
          {restantes !== null && <p className="text-xs text-muted-foreground">{restantes === 1 ? "Te queda" : "Te quedan"} {contar(restantes, "pregunta", "preguntas")} hoy</p>}
        </div>
        <Button type="submit" variant="accent" disabled={enviando || !texto.trim()}>
          Enviar
        </Button>
      </form>
    </>
  );
}

export function BurbujaMensaje({
  mensaje,
  videos,
  onPasarATutor,
}: {
  mensaje: Burbuja;
  videos: VideoResumen[];
  /** Si llega, ofrece pasar la pregunta a un tutor humano (H9). */
  onPasarATutor?: () => void;
}) {
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
      {/* Markdown sencillo del modelo: párrafos, listas, `código` y **negritas** (sin asteriscos a la vista). */}
      <TextoMarkdown texto={mensaje.texto} />
      {!!mensaje.fuentes?.length && (
        <ul className="flex flex-wrap gap-2">
          {mensaje.fuentes.map((f) => (
            <li key={`${f.videoId}-${f.segundo}`}>
              <FuenteVideo fuente={f} videos={videos} />
            </li>
          ))}
        </ul>
      )}
      {!esAlumno && !mensaje.error && mensaje.preguntaId && onPasarATutor && <PasarATutor estado={mensaje.pasada} onPasar={onPasarATutor} />}
    </div>
  );
}

/** Botón para pasar la duda a un tutor humano, o la confirmación de que ya se ha enviado. */
function PasarATutor({ estado, onPasar }: { estado: Burbuja["pasada"]; onPasar: () => void }) {
  if (estado === "enviada") {
    return (
      <p className="flex items-center gap-1 text-xs font-semibold">
        <UserRound className="size-3.5 shrink-0" aria-hidden />
        Enviada a tu tutor. Verás su respuesta arriba, en «Tus preguntas a tu tutor».
      </p>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1 whitespace-normal">
      <Button variant="outline" className="h-auto min-h-11 bg-background py-2 text-left" disabled={estado === "enviando"} onClick={onPasar}>
        <UserRound aria-hidden />
        {estado === "enviando" ? "Enviando a tu tutor…" : "¿No te sirve? Pregunta a tu tutor"}
      </Button>
      {typeof estado === "object" && <p role="alert" className="text-xs text-destructive">{estado.error}</p>}
    </div>
  );
}

/** Dudas que el alumno ha pasado a su tutor humano en este módulo (H9), con la respuesta cuando la hay. */
export function DudasConTutor({ dudas }: { dudas: DudaHumana[] }) {
  if (dudas.length === 0) return null;
  return (
    <section aria-labelledby="dudas-con-tutor" className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 id="dudas-con-tutor" className="flex items-center gap-2 text-base font-bold">
        <UserRound className="size-4 shrink-0" aria-hidden />
        Tus preguntas a tu tutor
      </h2>
      <ul className="flex flex-col gap-3">
        {dudas.map((d) => (
          <li key={d.id} className="flex flex-col items-start gap-1 text-sm">
            {/* El estado arriba: a 360 px, al lado de la pregunta la dejaba en una columna muy estrecha. */}
            {d.estado === "respondida" ? (
              <Badge>
                <UserCheck aria-hidden />
                Respondido por tu tutor
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock aria-hidden />
                Pendiente
              </Badge>
            )}
            <p className="w-full font-medium break-words">{d.pregunta}</p>
            {d.respuesta && (
              <p className="w-full rounded-md bg-muted px-3 py-2 whitespace-pre-wrap">
                <TextoConCodigo texto={d.respuesta} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
