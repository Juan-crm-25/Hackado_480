"use client";

import { MessagesSquare } from "lucide-react";
import type { MouseEvent } from "react";
import { buttonVariants } from "@/components/ui/button";

/** Botón de arriba del módulo que baja hasta el foro. Desplazamiento suave solo si no se pide movimiento reducido. */
export function IrAlForo() {
  function bajar(evento: MouseEvent<HTMLAnchorElement>) {
    const foro = document.getElementById("foro");
    if (!foro) return; // sin la sección, el enlace hace lo normal
    evento.preventDefault();
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    foro.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", "#foro");
    foro.focus({ preventScroll: true });
  }

  return (
    <a href="#foro" onClick={bajar} className={buttonVariants({ variant: "outline" })}>
      <MessagesSquare aria-hidden />
      Ir al foro
    </a>
  );
}
