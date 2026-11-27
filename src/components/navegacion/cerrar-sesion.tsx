"use client";

import type { ReactNode } from "react";
import { entrarConSesionNueva } from "@/lib/destino";
import { duracionDespedida, mostrarDespedida } from "./despedida";

/**
 * «Cerrar sesión»: borra la sesión en el servidor (POST /api/auth/logout) mientras se ve la despedida del astronauta
 * (./despedida.tsx), y vuelve a la home cargándola de cero (`entrarConSesionNueva`): así el navegador no puede
 * enseñar desde su caché páginas privadas de quien acaba de salir.
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
        entrarConSesionNueva("/");
      }}
    >
      {children}
    </button>
  );
}
