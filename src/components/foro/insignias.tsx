import { Award, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MOTIVOS_PUNTOS } from "@/lib/foro";
import type { PuntosProfesorForo } from "@/server/foro/servicio";

/** «+10 puntos» / «+5 puntos» de una respuesta valorada. Con 0 puntos no se muestra nada. */
export function InsigniaPuntos({ puntos }: { puntos: number }) {
  if (puntos <= 0) return null;
  return (
    <Badge variant="secondary">
      <Star aria-hidden />+{puntos} puntos
    </Badge>
  );
}

export const textoMotivo = (motivo: PuntosProfesorForo["motivo"]) => MOTIVOS_PUNTOS.find((m) => m.id === motivo)?.texto ?? motivo;

/** Puntos que ha dado el profesor: «+3 · Buena conducta». */
export function InsigniaPuntosProfesor({ puntos }: { puntos: PuntosProfesorForo | null }) {
  if (!puntos) return null;
  return (
    <Badge variant="outline">
      <Award aria-hidden />
      <span className="sr-only">Puntos del profesor: </span>+{puntos.puntos} · {textoMotivo(puntos.motivo)}
    </Badge>
  );
}
