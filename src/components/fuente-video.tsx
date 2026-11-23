import { enlaceYoutube, formatoMinuto } from "@/lib/formato";
import type { ReferenciaVideo } from "@/lib/types";

export interface VideoResumen {
  id: string;
  titulo: string;
  youtubeId: string;
}

/** Botón "▶ Vídeo · minuto" que abre el vídeo en el momento exacto (o solo lo indica si aún no hay enlace). */
export function FuenteVideo({ fuente, videos }: { fuente: ReferenciaVideo; videos: VideoResumen[] }) {
  const video = videos.find((v) => v.id === fuente.videoId);
  const etiqueta = `▶ ${video?.titulo ?? fuente.videoId} · ${formatoMinuto(fuente.segundo)}`;
  const href = video ? enlaceYoutube(video.youtubeId, fuente.segundo) : null;
  const clase = "inline-block rounded-full border bg-background px-3 py-1 text-xs";

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={clase}>
      {etiqueta}
    </a>
  ) : (
    <span className={clase} title="El vídeo aún no tiene enlace">
      {etiqueta}
    </span>
  );
}

/** Texto con los trozos entre `comillas invertidas` en monoespaciada (el modelo marca así el código). */
export function TextoConCodigo({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("`").map((trozo, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-background/60 px-1 font-mono text-[0.9em]">
            {trozo}
          </code>
        ) : (
          trozo
        ),
      )}
    </>
  );
}
