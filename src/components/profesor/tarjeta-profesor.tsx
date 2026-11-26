import { Clock } from "lucide-react";
import { BotonEnviarMensaje } from "@/components/mensajes/bandeja-mensajes";
import { iniciales } from "@/components/navegacion/avatar-usuario";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FichaProfesor } from "@/lib/demo/profesores";

/**
 * «Tu profesora / Tu profesor» del curso, con sus datos de demostración (src/lib/demo/profesores.ts)
 * y «Enviar mensaje», que abre la bandeja SIMULADA del MVP en su conversación.
 */
export function TarjetaProfesor({ profesor }: { profesor: FichaProfesor }) {
  return (
    <section aria-labelledby="profesor-del-curso" className="flex flex-col gap-3">
      <h2 id="profesor-del-curso" className="text-lg leading-tight font-bold">
        {profesor.tratamiento}
      </h2>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg" aria-hidden>
              <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">
                {iniciales(profesor.nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <p className="font-bold">{profesor.nombre}</p>
              <p className="text-sm text-muted-foreground">{profesor.rol}</p>
            </div>
          </div>
          <p className="text-sm">{profesor.bio}</p>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex gap-1">
              <dt className="text-muted-foreground">Experiencia:</dt>
              <dd className="font-medium">{profesor.anosExperiencia} años</dd>
            </div>
          </dl>
          <ul aria-label="Especialidades" className="flex flex-wrap gap-2">
            {profesor.especialidades.map((e) => (
              <li key={e}>
                <Badge variant="secondary">{e}</Badge>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" aria-hidden />
              {profesor.respuesta}
            </p>
            <BotonEnviarMensaje conversacion={profesor.conversacion} nombre={profesor.nombre} rol={profesor.rol} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
