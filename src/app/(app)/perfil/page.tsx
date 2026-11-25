import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { iniciales } from "@/components/navegacion/avatar-usuario";
import { getUsuarioDemo } from "@/lib/usuario-demo";

/** Perfil del usuario. De momento solo lectura: la edición llega con el login. */
export default function Perfil() {
  const usuario = getUsuarioDemo();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <h1 className="text-2xl leading-tight font-bold">Tu perfil</h1>

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

      <p className="max-w-prose text-sm text-muted-foreground">
        Podrás editar tu perfil cuando llegue el inicio de sesión. Por ahora ves un usuario de demostración.
      </p>
    </main>
  );
}
