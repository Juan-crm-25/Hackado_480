"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { duracionDespedida, mostrarDespedida, ocultarDespedida } from "./despedida";

/**
 * «Cerrar sesión»: borra la sesión en el servidor (POST /api/auth/logout) mientras se ve la despedida del astronauta
 * (./despedida.tsx), y vuelve a la home.
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
        mostrarDespedida();
        onCerrar?.();
        await Promise.all([
          fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined),
          new Promise((listo) => setTimeout(listo, duracionDespedida())),
        ]);
        router.push("/");
        router.refresh();
        setTimeout(ocultarDespedida, 400);
      }}
    >
      {children}
    </button>
  );
}
