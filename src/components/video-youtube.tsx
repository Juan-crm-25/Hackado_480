"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { embedYoutube, miniaturaYoutube } from "@/lib/youtube";

/**
 * Vídeo de YouTube que respeta la privacidad: hasta que el alumno pulsa «Reproducir» solo se carga
 * la miniatura (ni el reproductor ni cookies de YouTube). Al pulsar se cambia por el reproductor de
 * youtube-nocookie.com, que arranca solo.
 */
export function VideoYoutube({ youtubeId, titulo }: { youtubeId: string; titulo: string }) {
  const [activo, setActivo] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-dark">
      {activo ? (
        <iframe
          src={embedYoutube(youtubeId)}
          title={`Vídeo: ${titulo}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivo(true)}
          aria-label={`Reproducir: ${titulo}`}
          className="group absolute inset-0 flex size-full items-center justify-center rounded-lg focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          {/* Miniatura externa decorativa (el botón ya dice qué vídeo es): no necesita la optimización de next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={miniaturaYoutube(youtubeId)}
            alt=""
            width={480}
            height={360}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <span
            aria-hidden
            className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:scale-110"
          >
            <Play className="size-6 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
