import Image from "next/image";
import { iniciales } from "@/components/navegacion/avatar-usuario";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { AutorForo } from "@/server/foro/servicio";

/** Avatar de Sensei, la IA del foro. */
export const AVATAR_SENSEI = "/avatars/sensei.svg";

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Avatar, nombre, insignias («IA», «Profesor») y fecha de un tema o comentario. */
export function AutorForoLinea({ autor, creado }: { autor: AutorForo; creado: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {autor.esIa ? (
        <Image src={AVATAR_SENSEI} alt="" width={32} height={32} unoptimized className="size-8 shrink-0 rounded-full" />
      ) : (
        <Avatar aria-hidden>
          <AvatarFallback className="text-xs font-semibold">{iniciales(autor.nombre)}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate text-sm font-semibold">{autor.esIa ? "Sensei" : autor.nombre}</span>
        {autor.esIa && (
          <Badge variant="default" title="Inteligencia artificial">
            IA
          </Badge>
        )}
        {autor.esProfesor && <Badge variant="secondary">Profesor</Badge>}
        <time dateTime={creado} className="text-xs text-muted-foreground">
          {FECHA.format(new Date(creado))}
        </time>
      </div>
    </div>
  );
}
