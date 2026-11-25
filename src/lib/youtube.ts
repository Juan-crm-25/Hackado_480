/** Enlaces de YouTube. Sin dependencias de servidor: se pueden usar en el navegador. */
import { formatoMinuto } from "./formato";

// Los ids de YouTube son 11 caracteres de [A-Za-z0-9_-].
const ID_VALIDO = /^[A-Za-z0-9_-]{11}$/;

/** Id del vídeo a partir de un enlace `youtube.com/watch?v=<id>` o `youtu.be/<id>`; null si no es válido. */
export function idDeYoutube(url: string): string | null {
  let enlace: URL;
  try {
    enlace = new URL(url);
  } catch {
    return null;
  }
  const host = enlace.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtube.com" && enlace.pathname === "/watch") id = enlace.searchParams.get("v");
  else if (host === "youtu.be") id = enlace.pathname.slice(1);
  return id && ID_VALIDO.test(id) ? id : null;
}

/** Miniatura del vídeo (se muestra hasta que el alumno pulsa «Reproducir»). */
export function miniaturaYoutube(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Reproductor sin cookies de seguimiento; arranca al cargarse porque solo se carga al pulsar «Reproducir». */
export function embedYoutube(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
}

/** 403 → "6:43" (lo que se ve junto al título del vídeo). */
export function duracionVideo(segundos: number): string {
  return formatoMinuto(segundos);
}

/** 403 → "6 min 43 s" (lo que oye un lector de pantalla en lugar de "6:43"). */
export function duracionAccesible(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return [m > 0 ? `${m} min` : "", s > 0 || m === 0 ? `${s} s` : ""].filter(Boolean).join(" ");
}
