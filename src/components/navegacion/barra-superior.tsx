import { Marca } from "@/components/marca";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Barra superior. En móvil y tableta: marca a la izquierda y avatar a la derecha.
 * En web la marca está en la barra lateral, así que solo queda el avatar a la derecha.
 * `usuario` es la zona del usuario (avatar o «Entrar»), que depende de la sesión.
 */
export function BarraSuperior({ usuario }: { usuario: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 lg:justify-end lg:px-8">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-sm text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring lg:hidden"
      >
        <Marca />
      </Link>
      {usuario}
    </header>
  );
}
