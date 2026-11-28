import { Badge } from "@/components/ui/badge";
import { enlaceYoutube, formatoMinuto } from "@/lib/formato";
import type { ReferenciaVideo } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface VideoResumen {
  id: string;
  titulo: string;
  youtubeId: string;
}

// Píldora con zona táctil de 44 px: el ::after amplía el área de toque sin agrandar la píldora.
const CLASE_PILDORA = "h-auto min-h-8 max-w-full px-3 py-1 text-left whitespace-normal";
const CLASE_TACTIL = "relative overflow-visible after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']";

/** Botón "▶ Vídeo · minuto" que abre el vídeo en el momento exacto (o solo lo indica si aún no hay enlace). */
export function FuenteVideo({ fuente, videos }: { fuente: ReferenciaVideo; videos: VideoResumen[] }) {
  const video = videos.find((v) => v.id === fuente.videoId);
  const etiqueta = `▶ ${video?.titulo ?? fuente.videoId} · ${formatoMinuto(fuente.segundo)}`;
  const href = video ? enlaceYoutube(video.youtubeId, fuente.segundo) : null;

  return href ? (
    <Badge
      variant="outline"
      className={cn(CLASE_PILDORA, CLASE_TACTIL, "bg-background hover:bg-muted")}
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
    >
      {etiqueta}
    </Badge>
  ) : (
    <Badge variant="outline" className={cn(CLASE_PILDORA, "bg-background")} title="El vídeo aún no tiene enlace">
      {etiqueta}
    </Badge>
  );
}

/**
 * Texto con los trozos entre `comillas invertidas` en monoespaciada (el modelo marca así el código) y los que van
 * entre **dos asteriscos** en negrita. Dentro del código no se tocan los asteriscos; unos sin cerrar se quedan tal cual.
 */
export function TextoConCodigo({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("`").map((trozo, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-background/60 px-1 font-mono text-[0.9em]">
            {trozo}
          </code>
        ) : (
          <ConNegritas key={i} texto={trozo} />
        ),
      )}
    </>
  );
}

const NEGRITA = /\*\*([^*\n]+?)\*\*/g;

function ConNegritas({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = [];
  let desde = 0;
  for (const m of texto.matchAll(NEGRITA)) {
    partes.push(texto.slice(desde, m.index));
    partes.push(<strong key={m.index}>{m[1]}</strong>);
    desde = m.index + m[0].length;
  }
  partes.push(texto.slice(desde));
  return <>{partes}</>;
}
