"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * «Cerrar sesión»: borra la sesión en el servidor (POST /api/auth/logout) y vuelve a la home.
 * Aunque la petición falle, se vuelve a la home: la cookie caduca sola y las páginas privadas validan la sesión.
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
      onClick={async () => {
        onCerrar?.();
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        router.push("/");
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}
