import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { iniciales } from "@/components/navegacion/avatar-usuario";
import { Suspense } from "react";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { PuntosForo } from "@/components/foro/puntos-foro";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { obtenerPuntosDelAlumno, type PuntosDelAlumno } from "@/server/recompensas/servicio";

/** Perfil del usuario de la sesión. De momento solo lectura. */
export default function Perfil() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <h1 className="text-2xl leading-tight font-bold">Tu perfil</h1>
      <Suspense fallback={<EstadoCargando texto="Cargando tu perfil…" />}>
        <DatosPerfil />
      </Suspense>
    </main>
  );
}

async function DatosPerfil() {
  const usuario = await requerirUsuarioActual();
  const puntos = await leerPuntos(usuario.id);

  return (
    <>
      <Card className="max-w-xl">
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-16" aria-hidden>
            <AvatarFallback className="bg-accent text-xl font-bold text-accent-foreground">
              {iniciales(usuario.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <p className="text-xl font-bold">{usuario.nombre}</p>
            <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
          </div>
        </CardContent>
      </Card>

      {puntos ? (
        <PuntosForo puntos={puntos} />
      ) : (
        <EstadoError className="max-w-xl">No se han podido cargar tus puntos del foro.</EstadoError>
      )}

      <p className="max-w-prose text-sm text-muted-foreground">Pronto podrás editar tu perfil.</p>
    </>
  );
}

/** Puntos del foro; si la BBDD falla, el perfil se sigue viendo con el aviso del error. */
async function leerPuntos(usuarioId: string): Promise<PuntosDelAlumno | null> {
  try {
    return await obtenerPuntosDelAlumno(usuarioId);
  } catch (error) {
    console.error("[perfil] No se pudieron leer los puntos del foro:", error);
    return null;
  }
}
