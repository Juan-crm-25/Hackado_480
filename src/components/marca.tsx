"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Palabras de la marca que van rotando en vertical (como «Word Rotate» de Magic UI, hecho con CSS).
 * Cada una lleva su guion bajo con un color fijo de la marca: verde, cian y coral.
 */
export const PALABRAS_MARCA = [
  { antes: "480", despues: "Academy", guion: "bg-brand" },
  { antes: "learnby", despues: "dō", guion: "bg-brand-cyan" },
  { antes: "hackan", despues: "dō", guion: "bg-brand-coral" },
] as const;

/** Cada cuánto cambia la palabra (en móvil y en web). */
export const INTERVALO_MS = 10_000;

export function siguientePalabra(actual: number, total: number): number {
  return (actual + 1) % total;
}

/**
 * Logotipo de texto: «480_Academy» → «learnby_dō» → «hackan_dō».
 * - Los lectores de pantalla leen siempre «480 Academy»: la rotación es decorativa (aria-hidden).
 * - Con «reducir movimiento» no rota y se queda en «480_Academy».
 * - Todas las palabras ocupan la misma celda de una rejilla: el ancho es el de la más larga, así que nada salta.
 */
export function Marca() {
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActual((i) => siguientePalabra(i, PALABRAS_MARCA.length)), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, []);

  const anterior = (actual - 1 + PALABRAS_MARCA.length) % PALABRAS_MARCA.length;

  return (
    <span className="inline-flex">
      <span className="sr-only">480 Academy</span>
      <span aria-hidden="true" data-rotacion className="inline-grid overflow-hidden py-[0.12em]">
        {PALABRAS_MARCA.map((p, i) => (
          <span
            key={p.antes}
            data-palabra={i}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-baseline whitespace-nowrap motion-safe:transition-[transform,opacity] motion-safe:duration-500 motion-safe:ease-out",
              i === actual
                ? "translate-y-0 opacity-100"
                : i === anterior
                  ? "-translate-y-full opacity-0"
                  : "translate-y-full opacity-0",
            )}
          >
            {p.antes}
            <span className={cn("mx-0.5 mb-[0.18em] inline-block h-[0.16em] w-[0.55em] self-end", p.guion)} />
            {p.despues}
          </span>
        ))}
      </span>
    </span>
  );
}
