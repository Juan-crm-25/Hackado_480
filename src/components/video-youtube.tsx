"use client";

import { Play } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  detenerVideo,
  embedYoutube,
  leerMensajeYoutube,
  miniaturaYoutube,
  ORIGENES_YOUTUBE,
  YOUTUBE_REPRODUCIENDO,
} from "@/lib/youtube";

/**
 * Vídeo de YouTube que respeta la privacidad: hasta que el alumno pulsa «Reproducir» solo se carga
 * la miniatura (ni el reproductor ni cookies de YouTube). Al pulsar se cambia por el reproductor de
 * youtube-nocookie.com, que arranca solo.
 * Con `onReproduciendo` se activa la API del reproductor (postMessage) y se avisa cada vez que empieza
 * (true) o deja (false) de reproducirse; sin él, el reproductor se carga como siempre.
 * Al salir de la pantalla el vídeo se para y vuelve la miniatura (ver el efecto de abajo).
 */
export function VideoYoutube({
  youtubeId,
  titulo,
  onReproduciendo,
}: {
  youtubeId: string;
  titulo: string;
  onReproduciendo?: (reproduciendo: boolean) => void;
}) {
  const [activo, setActivo] = useState(false);
  const marco = useRef<HTMLIFrameElement>(null);
  const escuchar = activo && onReproduciendo !== undefined;

  /*
   * Con Cache Components, Next.js no quita la pantalla al navegar: la esconde con <Activity> para recuperarla, y un
   * iframe escondido sigue sonando. Al esconderla, React ejecuta la limpieza de los efectos: ahí se para el vídeo al
   * instante y se vuelve a la miniatura, para que al regresar no arranque solo.
   */
  useLayoutEffect(() => {
    const reproductor = marco;
    return () => {
      detenerVideo(reproductor.current);
      setActivo(false);
    };
  }, []);

  useEffect(() => {
    if (!escuchar || !onReproduciendo) return;
    function alRecibir(e: MessageEvent) {
      if (e.source !== marco.current?.contentWindow) return;
      const mensaje = leerMensajeYoutube(e.origin, e.data);
      if (mensaje) onReproduciendo?.(mensaje.estadoReproductor === YOUTUBE_REPRODUCIENDO);
    }
    window.addEventListener("message", alRecibir);
    return () => {
      window.removeEventListener("message", alRecibir);
      onReproduciendo(false);
    };
  }, [escuchar, onReproduciendo]);

  /** Pide al reproductor que mande su estado (protocolo de la API de iframes de YouTube). */
  function pedirEstado() {
    const ventana = marco.current?.contentWindow;
    if (!escuchar || !ventana) return;
    const destino = ORIGENES_YOUTUBE[0];
    ventana.postMessage(JSON.stringify({ event: "listening", id: youtubeId, channel: "widget" }), destino);
    ventana.postMessage(
      JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id: youtubeId }),
      destino,
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-dark">
      {activo ? (
        <iframe
          ref={marco}
          onLoad={pedirEstado}
          src={embedYoutube(youtubeId, escuchar ? window.location.origin : undefined)}
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
