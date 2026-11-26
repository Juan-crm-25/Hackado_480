import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PuntosDelAlumno } from "@/server/recompensas/servicio";

/** Puntos del foro del alumno en su perfil: total y de dónde vienen. */
export function PuntosForo({ puntos }: { puntos: PuntosDelAlumno }) {
  return (
    <Card className="max-w-xl">
      <CardContent className="flex items-center gap-4">
        <Trophy className="size-8 shrink-0" aria-hidden />
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-muted-foreground">Puntos del foro</p>
          <p className="text-2xl font-bold">
            {puntos.total} <span className="text-base font-semibold">puntos</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {puntos.respuestas} por tus respuestas · {puntos.profesor} del profesor
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
