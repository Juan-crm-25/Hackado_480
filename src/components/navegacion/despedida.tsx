"use client";

import { useSyncExternalStore } from "react";

/*
 * Despedida al cerrar sesión: un astronauta despega en su cohete con «¡Hasta pronto!».
 * Se monta una sola vez en el marco de la app (src/app/(app)/layout.tsx) y el botón solo la dispara: en móvil,
 * «Cerrar sesión» vive en el menú «Más», que se cierra al pulsarlo y se llevaría la animación con él.
 * Ilustración: «Lindo astronauta montando cohete», de catalyststuff en Magnific (licencia gratuita, con atribución).
 */

let despidiendo = false;
const oyentes = new Set<() => void>();

function cambiar(valor: boolean) {
  despidiendo = valor;
  oyentes.forEach((avisar) => avisar());
}

export const mostrarDespedida = () => cambiar(true);
export const ocultarDespedida = () => cambiar(false);
export const estaDespidiendo = () => despidiendo;

export function suscribirDespedida(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

/** Lo que dura la despedida antes de ir a la home; sin animaciones basta con un momento para leerla. */
export function duracionDespedida() {
  const reducido = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return reducido ? 600 : 1600;
}

export function PantallaDespedida() {
  return (
    <div
      role="status"
      // z-[60]: por encima del panel del menú «Más» (z-50), que sigue cerrándose detrás.
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 overflow-hidden bg-background/95 px-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG local decorativo: no necesita la optimización de next/image */}
      <img
        src="/ilustraciones/astronauta.svg"
        alt=""
        width={262}
        height={313}
        className="w-40 md:w-56 motion-safe:animate-despegar"
      />
      <p className="text-2xl font-bold">¡Hasta pronto!</p>
    </div>
  );
}

/** Pantalla de despedida conectada al estado: no pinta nada hasta que alguien cierra sesión. */
export function DespedidaSesion() {
  const visible = useSyncExternalStore(suscribirDespedida, estaDespidiendo, () => false);
  return visible ? <PantallaDespedida /> : null;
}
