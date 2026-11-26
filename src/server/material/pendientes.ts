import "server-only";
import type { TipoMaterialClase } from "./repositorio";

/** Qué hay que generar de cada tipo para un vídeo. */
export type PorGenerar = Record<TipoMaterialClase, boolean>;

/**
 * Qué le falta a un vídeo (su slug, p. ej. "v04") a partir de lo que ya hay guardado en su módulo.
 * Sin `forzar`, solo lo que no existe: no se gasta IA en repetir. Con `forzar`, también lo que existe sin revisar;
 * lo revisado por una persona no se regenera nunca.
 */
export function porGenerar(
  videoId: string,
  guardado: { videoId: string; tipo: TipoMaterialClase; revisado: boolean }[],
  forzar: boolean,
): PorGenerar {
  const falta = (tipo: TipoMaterialClase) => {
    const fila = guardado.find((g) => g.videoId === videoId && g.tipo === tipo);
    if (!fila) return true;
    return forzar && !fila.revisado;
  };
  return { resumen: falta("resumen"), tarjetas: falta("tarjetas"), infografia: falta("infografia") };
}
