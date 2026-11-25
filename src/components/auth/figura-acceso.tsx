import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Ilustración decorativa de las pantallas de acceso (login y registro): un astronauta que flota arriba y abajo despacio.
 * - La pantalla decide dónde va y su tamaño con `className`.
 * - Con «reducir movimiento» se queda quieto.
 * - Es decorativa: alt vacío, oculta a los lectores de pantalla y no captura clics.
 */
export function FiguraAcceso({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none select-none motion-safe:animate-flotar", className)}
    >
      <Image
        src="/images/astronauta.png"
        alt=""
        width={805}
        height={635}
        className="h-auto w-full"
        sizes="(min-width: 1280px) 28rem, (min-width: 1024px) 20rem, 16rem"
      />
    </div>
  );
}
