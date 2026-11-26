import Link from "next/link";
import { BotonMensajes } from "@/components/mensajes/bandeja-mensajes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Iniciales del nombre y del último apellido: «Lucía Martín» → «LM». */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${partes[0][0]}${ultima}`.toUpperCase();
}

/** Avatar del usuario: iniciales en verde con texto carbón; lleva al perfil (docs/estilo.md, apartado 10). */
export function AvatarUsuario({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <Link
      href="/perfil"
      aria-label="Tu perfil"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      <Avatar size="lg" aria-hidden>
        <AvatarFallback className="bg-accent text-sm font-bold text-accent-foreground">{iniciales(nombre)}</AvatarFallback>
      </Avatar>
    </Link>
  );
}

/**
 * Zona del usuario en la barra superior: con sesión, el icono de mensajes (bandeja simulada del MVP)
 * y su avatar; si es un visitante, «Entrar».
 */
export function AccesoUsuario({ nombre }: { nombre: string | null }) {
  if (nombre)
    return (
      <div className="flex items-center gap-1">
        <BotonMensajes />
        <AvatarUsuario nombre={nombre} />
      </div>
    );
  return (
    <Link href="/login" className={buttonVariants({ variant: "outline" })}>
      Entrar
    </Link>
  );
}
