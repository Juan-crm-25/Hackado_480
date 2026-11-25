"use client";

import { ArrowLeft, BookCheck, CircleCheck, Flame, LoaderCircle, RotateCcw, ThumbsUp, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ASISTENTE_INICIAL, avanceAsistente, elegir, estaTerminado, volver, type EstadoAsistente } from "@/lib/asistente-ruta";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import { VALORACIONES, type ModuloDeRuta, type RespuestaRuta, type Valoracion } from "@/lib/ruta";
import { cn } from "@/lib/utils";
import { ResultadoRuta } from "./resultado-ruta";
import { temaDe } from "./temas";

/** Icono y qué pasa con el módulo en cada respuesta: el texto explica la consecuencia, no solo el color. */
const DETALLE: Record<Valoracion, { icono: LucideIcon; ayuda: string }> = {
  mucho: { icono: Flame, ayuda: "Lo pondremos de los primeros" },
  interesa: { icono: ThumbsUp, ayuda: "Lo verás a tu ritmo" },
  sabe: { icono: BookCheck, ayuda: "Lo dejamos para el final" },
};

/**
 * «Personaliza tu ruta» como carrusel: un módulo cada vez, tres respuestas grandes y una barra que se llena.
 * Al contestar el último se envía solo (PUT /api/cursos/:slug/ruta) y se muestra la recomendación del tutor.
 */
export function ValorarModulos({ slug, modulos }: { slug: string; modulos: ModuloDeRuta[] }) {
  const router = useRouter();
  const total = modulos.length;
  const [estado, setEstado] = useState<EstadoAsistente>(ASISTENTE_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespuestaRuta | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const yaHaContestado = useRef(false);

  const enviar = useCallback(
    async (valoraciones: Record<string, Valoracion>) => {
      setEnviando(true);
      setError(null);
      try {
        const res = await fetch(`/api/cursos/${encodeURIComponent(slug)}/ruta`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ valoraciones }),
        });
        setResultado(await leerRespuesta<RespuestaRuta>(res));
        router.refresh(); // el panel ya muestra la ruta nueva
      } catch (e) {
        setError(mensajeDeError(e));
      } finally {
        setEnviando(false);
      }
    },
    [slug, router],
  );

  const terminado = estaTerminado(estado, total);

  // Al contestar el último módulo, se envía solo.
  useEffect(() => {
    if (terminado && yaHaContestado.current && !resultado && !enviando && !error) void enviar(estado.valoraciones);
  }, [terminado, resultado, enviando, error, enviar, estado.valoraciones]);

  // Al cambiar de módulo, el foco va a su título (teclado y lector de pantalla siguen el carrusel).
  useEffect(() => {
    if (yaHaContestado.current) titulo.current?.focus();
  }, [estado.indice]);

  if (resultado) {
    return (
      <ResultadoRuta
        resultado={resultado}
        onCambiar={() => {
          yaHaContestado.current = false;
          setResultado(null);
          setEstado({ indice: 0, valoraciones: estado.valoraciones });
        }}
      />
    );
  }

  const avance = avanceAsistente(estado, total);
  const contestados = Math.min(Object.keys(estado.valoraciones).length, total);
  const modulo = modulos[Math.min(estado.indice, total - 1)];
  const tema = temaDe(Math.min(estado.indice, total - 1));
  const elegida = modulo ? estado.valoraciones[modulo.id] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold">{terminado ? "¡Listo!" : `Módulo ${estado.indice + 1} de ${total}`}</span>
          <span className="text-muted-foreground tabular-nums">
            {contestados} de {total} respondidos
          </span>
        </div>
        <Progress
          value={avance}
          aria-label="Progreso al personalizar tu ruta"
          className="[&_[data-slot=progress-indicator]]:bg-brand [&_[data-slot=progress-track]]:h-3"
        />
        <ol className="flex justify-center gap-2 pt-1" aria-hidden>
          {modulos.map((m, i) => (
            <li
              key={m.id}
              className={cn(
                "h-2 rounded-full motion-safe:transition-all motion-safe:duration-300",
                i === estado.indice ? "w-6 bg-primary" : "w-2",
                i !== estado.indice && (estado.valoraciones[m.id] ? temaDe(i).franja : "bg-muted"),
              )}
            />
          ))}
        </ol>
      </div>

      {terminado ? (
        <Card className="items-center gap-3 py-10 text-center">
          {error ? (
            <>
              <EstadoError>{error}</EstadoError>
              <Button type="button" variant="accent" size="lg" onClick={() => enviar(estado.valoraciones)}>
                <RotateCcw aria-hidden />
                Reintentar
              </Button>
            </>
          ) : (
            <p role="status" className="flex items-center gap-2 text-lg font-semibold">
              <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden />
              Tu tutor está preparando tu ruta…
            </p>
          )}
        </Card>
      ) : (
        <Card
          key={modulo.id}
          className="gap-0 overflow-hidden p-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:duration-300"
        >
          <div className={cn("flex flex-col gap-3 p-6", tema.suave)}>
            <div aria-hidden className={cn("h-1.5 w-12 rounded-full", tema.franja)} />
            <span
              className={cn("inline-flex size-12 items-center justify-center rounded-full text-xl font-bold tabular-nums", tema.circulo)}
              aria-hidden
            >
              {estado.indice + 1}
            </span>
            <h2 ref={titulo} tabIndex={-1} className="text-2xl leading-tight font-bold outline-none md:text-3xl">
              {modulo.titulo}
            </h2>
            <p className="max-w-prose text-muted-foreground">{modulo.descripcion}</p>
          </div>

          <div className="flex flex-col gap-3 p-6" role="group" aria-labelledby={`pregunta-${modulo.id}`}>
            <p id={`pregunta-${modulo.id}`} className="font-semibold">
              ¿Cuánto te interesa {modulo.titulo}?
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {VALORACIONES.map((v) => {
                const { icono: Icono, ayuda } = DETALLE[v.id];
                const marcada = elegida === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    data-valoracion={v.id}
                    aria-pressed={marcada}
                    onClick={() => {
                      yaHaContestado.current = true;
                      setEstado((e) => elegir(e, modulo.id, v.id, total));
                    }}
                    className={cn(
                      "relative flex min-h-16 items-center gap-3 rounded-lg border-2 bg-background p-4 text-left transition-colors duration-150 outline-none hover:border-primary hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring md:flex-col md:items-start",
                      marcada ? "border-primary bg-muted" : "border-border",
                    )}
                  >
                    <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full", tema.circulo)} aria-hidden>
                      <Icono className="size-5" />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-semibold">{v.texto}</span>
                      <span className="text-sm text-muted-foreground">{ayuda}</span>
                    </span>
                    {marcada && <CircleCheck className="absolute top-3 right-3 size-5" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={estado.indice === 0 || enviando}
          onClick={() => {
            setError(null);
            setEstado(volver);
          }}
        >
          <ArrowLeft aria-hidden />
          Atrás
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {terminado ? "Has respondido todos los módulos." : `Módulo ${estado.indice + 1} de ${total}: ${modulo.titulo}`}
      </p>
    </div>
  );
}
