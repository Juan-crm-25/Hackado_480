/** Utilidades de presentación. Sin dependencias de servidor: se pueden usar en el navegador. */

/** 125 → "2:05" */
export function formatoMinuto(segundo: number): string {
  const m = Math.floor(segundo / 60);
  const s = Math.floor(segundo % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Enlace al momento exacto de un vídeo de YouTube, o null si el vídeo aún no tiene id. */
export function enlaceYoutube(youtubeId: string, segundo: number): string | null {
  return youtubeId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}&t=${Math.floor(segundo)}s` : null;
}

/** Alumno con el que se usa la app mientras no hay login (fuera del alcance del prototipo). */
export const ALUMNO_DEMO_ID = "a1";
