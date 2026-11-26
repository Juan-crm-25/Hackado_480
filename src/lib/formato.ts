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


const EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const UN_DECIMAL = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Precio de un curso: 0 → "Gratis"; 4900 → "49,00 €". */
export function formatoPrecio(centimos: number): string {
  return centimos === 0 ? "Gratis" : EUROS.format(centimos / 100);
}

/** 4.6 → "4,6" (una cifra decimal, coma española). */
export function formatoDecimal(numero: number): string {
  return UN_DECIMAL.format(numero);
}
