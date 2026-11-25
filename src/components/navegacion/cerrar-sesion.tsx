"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * «Cerrar sesión». Aún no hay login (paso 2): de momento solo vuelve a la home.
 * No simula ninguna sesión.
 */
export function BotonCerrarSesion({
  className,
  children,
  onCerrar,
}: {
  className?: string;
  children: ReactNode;
  onCerrar?: () => void;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-destino="cerrar-sesion"
      className={className}
      onClick={() => {
        // TODO(login): cerrar la sesión con Better Auth
        onCerrar?.();
        router.push("/");
      }}
    >
      {children}
    </button>
  );
}
