"use client";

import { ChevronDown, CircleCheck, CircleDashed } from "lucide-react";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { EstadoVacio } from "@/components/estado";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { VideoYoutube } from "@/components/video-youtube";
import type { ClaseCatalogo } from "@/lib/catalogo-bd";
import { cn } from "@/lib/utils";
import { duracionAccesible, duracionVideo } from "@/lib/youtube";
import { type AlmacenVistos, claveVistos, leerTextoVistos, marcarVisto, vistosDeTexto } from "./vistos";

/** localStorage si existe y se deja leer (puede lanzar con el almacenamiento bloqueado). */
function almacenLocal(): AlmacenVistos | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Avisos de cambios en esta pestaña; los de otras pestañas llegan con el evento «storage».
const oyentes = new Set<() => void>();
function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

/**
 * Vídeos del módulo como acordeón: cada clase es una fila plegada (título, duración y «Visto» / «No visto»)
 * que al pulsarla se abre y muestra el reproductor; plegada no se carga nada de YouTube.
 * Abrir un vídeo lo marca como visto (en este navegador, ver `vistos.ts`) y arriba se ve el progreso.
 * En el servidor nada está visto; lo guardado se lee al hidratar (useSyncExternalStore).
 */
export function VideosModulo({
  cursoSlug,
  moduloSlug,
  clases,
}: {
  cursoSlug: string;
  moduloSlug: string;
  clases: ClaseCatalogo[];
}) {
  const clave = claveVistos(cursoSlug, moduloSlug);
  const texto = useSyncExternalStore(
    suscribir,
    () => leerTextoVistos(almacenLocal(), clave),
    () => null,
  );
  const vistos = useMemo(() => vistosDeTexto(texto), [texto]);
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set());
  const base = useId();

  const total = clases.length;
  const numVistos = clases.filter((c) => vistos.has(c.id)).length;
  const resumen = `${numVistos} de ${total} vídeos vistos`;

  function alternar(claseId: string) {
    const abrir = !abiertas.has(claseId);
    setAbiertas((previas) => {
      const nuevas = new Set(previas);
      if (abrir) nuevas.add(claseId);
      else nuevas.delete(claseId);
      return nuevas;
    });
    if (abrir && !vistos.has(claseId)) {
      marcarVisto(almacenLocal(), clave, claseId);
      oyentes.forEach((avisar) => avisar());
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Progress value={numVistos} max={total} getAriaValueText={() => resumen} className="gap-2">
        <ProgressLabel className="text-sm text-muted-foreground">{resumen}</ProgressLabel>
      </Progress>

      <ol className="flex flex-col gap-2">
        {clases.map((clase, i) => {
          const abierta = abiertas.has(clase.id);
          const visto = vistos.has(clase.id);
          const idBoton = `${base}-boton-${clase.id}`;
          const idPanel = `${base}-panel-${clase.id}`;
          return (
            <li key={clase.id} className="rounded-lg border bg-card">
              <h3>
                <button
                  type="button"
                  id={idBoton}
                  aria-expanded={abierta}
                  aria-controls={idPanel}
                  onClick={() => alternar(clase.id)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 ease-in-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base font-semibold">
                      <span className="text-muted-foreground">{i + 1}.</span> {clase.titulo}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span aria-hidden>{duracionVideo(clase.duracionSegundos)}</span>
                      <span className="sr-only">Duración: {duracionAccesible(clase.duracionSegundos)}.</span>
                      <EstadoVisto visto={visto} />
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out",
                      abierta && "rotate-180",
                    )}
                  />
                </button>
              </h3>
              <div
                id={idPanel}
                role="region"
                aria-labelledby={idBoton}
                hidden={!abierta}
                className="px-3 pb-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              >
                {abierta &&
                  (clase.youtubeId ? (
                    <VideoYoutube youtubeId={clase.youtubeId} titulo={clase.titulo} />
                  ) : (
                    <EstadoVacio>
                      Este vídeo no se puede incrustar.{" "}
                      <a
                        href={clase.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        Ábrelo en una pestaña nueva
                      </a>
                      .
                    </EstadoVacio>
                  ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** «Visto» con relleno verde, texto carbón e icono; «No visto» en gris con otro icono: nunca solo el color. */
function EstadoVisto({ visto }: { visto: boolean }) {
  return visto ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-surface-dark">
      <CircleCheck className="size-3.5" aria-hidden />
      Visto
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <CircleDashed className="size-3.5" aria-hidden />
      No visto
    </span>
  );
}
