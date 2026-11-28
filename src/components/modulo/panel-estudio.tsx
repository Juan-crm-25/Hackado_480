"use client";

import { BookOpenText, ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Resumen, Tarjetas } from "@/app/(app)/(privado)/modulos/[id]/material/vista-material";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import type { VideoResumen } from "@/components/fuente-video";
import { VistaInfografia } from "@/components/infografia";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enlaceYoutube, formatoMinuto } from "@/lib/formato";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { EstudioVideo } from "@/lib/types";
import { cn } from "@/lib/utils";

type Pestana = "transcripcion" | "resumen" | "tarjetas" | "diagrama";

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "transcripcion", texto: "Transcripción" },
  { id: "resumen", texto: "Resumen" },
  { id: "tarjetas", texto: "Tarjetas" },
  { id: "diagrama", texto: "Diagrama" },
];

type Estado = { tipo: "cargando" } | { tipo: "error"; mensaje: string } | { tipo: "ok"; estudio: EstudioVideo };

/**
 * Panel de estudio de un vídeo (#39), estilo NotebookLM: plegado, con un botón; al abrirlo pide a la API la
 * transcripción y el material revisado de ESE vídeo (`/api/modulos/:id/videos/:video/estudio`).
 */
export function PanelEstudio({ moduloSlug, video }: { moduloSlug: string; video: VideoResumen }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);
  const idPanel = `${useId()}-estudio`;

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    fetch(`/api/modulos/${encodeURIComponent(moduloSlug)}/videos/${encodeURIComponent(video.id)}/estudio`)
      .then((res) => leerRespuesta<EstudioVideo>(res))
      .then(
        (estudio) => vigente && setEstado({ tipo: "ok", estudio }),
        (e: unknown) => vigente && setEstado({ tipo: "error", mensaje: mensajeDeError(e) }),
      );
    return () => {
      vigente = false;
    };
  }, [abierto, moduloSlug, video.id, intento]);

  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((a) => !a)}
        className="justify-between"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          <BookOpenText aria-hidden />
          Estudiar este vídeo
        </span>
        <ChevronDown
          aria-hidden
          className={cn("motion-safe:transition-transform motion-safe:duration-300", abierto && "rotate-180")}
        />
      </Button>
      <div id={idPanel} hidden={!abierto}>
        {abierto &&
          (estado.tipo === "cargando" ? (
            <EstadoCargando texto="Cargando el material del vídeo…" />
          ) : estado.tipo === "error" ? (
            <div className="flex flex-col items-start gap-2">
              <EstadoError>{estado.mensaje}</EstadoError>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEstado({ tipo: "cargando" });
                  setIntento((n) => n + 1);
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <ContenidoEstudio estudio={estado.estudio} video={video} />
          ))}
      </div>
    </section>
  );
}

/** Las cuatro pestañas del panel. Una pestaña sin nada revisado lo dice; nunca se queda en blanco. */
export function ContenidoEstudio({
  estudio,
  video,
  pestanaInicial = "transcripcion",
}: {
  estudio: EstudioVideo;
  video: VideoResumen;
  pestanaInicial?: Pestana;
}) {
  const [pestana, setPestana] = useState<Pestana>(pestanaInicial);
  const videos = [video];
  return (
    <Tabs value={pestana} onValueChange={(v: Pestana) => setPestana(v)} className="gap-3">
      <TabsList className="grid w-full grid-flow-col auto-cols-fr">
        {PESTANAS.map((p) => (
          <TabsTrigger key={p.id} value={p.id} className="px-1 text-xs sm:text-sm">
            {p.texto}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="transcripcion">
        {estudio.transcripcion.length === 0 ? (
          <EstadoVacio>Este vídeo todavía no tiene transcripción.</EstadoVacio>
        ) : (
          <ol
            tabIndex={0}
            aria-label={`Transcripción de «${video.titulo}»`}
            className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-lg bg-muted p-3 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          >
            {estudio.transcripcion.map((f) => (
              <li key={f.inicio} className="flex gap-3 text-sm leading-relaxed">
                <EnlaceMinuto video={video} segundo={f.inicio} />
                <p className="min-w-0 flex-1">{f.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </TabsContent>
      <TabsContent value="resumen">
        {estudio.resumen.length ? (
          <Resumen secciones={estudio.resumen} videos={videos} />
        ) : (
          <EstadoVacio>Este vídeo todavía no tiene resumen revisado.</EstadoVacio>
        )}
      </TabsContent>
      <TabsContent value="tarjetas">
        {estudio.tarjetas.length ? (
          <Tarjetas tarjetas={estudio.tarjetas} videos={videos} />
        ) : (
          <EstadoVacio>Este vídeo todavía no tiene tarjetas revisadas.</EstadoVacio>
        )}
      </TabsContent>
      <TabsContent value="diagrama" className="flex flex-col gap-3">
        {estudio.infografias.length ? (
          estudio.infografias.map((info) => <VistaInfografia key={info.conceptoId} infografia={info} videos={videos} />)
        ) : (
          <EstadoVacio>Este vídeo todavía no tiene diagrama revisado.</EstadoVacio>
        )}
      </TabsContent>
    </Tabs>
  );
}

/** «1:35» que abre el vídeo de YouTube en ese momento (o solo el minuto si el vídeo no tiene enlace). */
function EnlaceMinuto({ video, segundo }: { video: VideoResumen; segundo: number }) {
  const href = enlaceYoutube(video.youtubeId, segundo);
  const clase = "shrink-0 font-mono text-xs tabular-nums";
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ver «${video.titulo}» desde el minuto ${formatoMinuto(segundo)}`}
      className={cn(
        clase,
        "inline-flex min-h-11 items-start rounded-sm pt-0.5 font-semibold text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      {formatoMinuto(segundo)}
    </a>
  ) : (
    <span className={cn(clase, "pt-0.5 text-muted-foreground")}>{formatoMinuto(segundo)}</span>
  );
}
