import { Marca } from "@/components/marca";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Barra superior. En móvil y tableta: marca centrada y avatar a la derecha (rejilla de tres columnas, la
 * primera vacía, para que la marca quede en el centro real de la pantalla).
 * En web la marca está en la barra lateral, así que solo queda el avatar a la derecha.
 * `usuario` es la zona del usuario (avatar o «Entrar»), que depende de la sesión.
 */
export function BarraSuperior({ usuario }: { usuario: ReactNode }) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-background px-4 lg:flex lg:justify-end lg:px-8">
      <span aria-hidden className="lg:hidden" />
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-self-center rounded-sm text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring lg:hidden"
      >
        <Marca />
      </Link>
      <div className="flex justify-self-end">{usuario}</div>
    </header>
  );
}
