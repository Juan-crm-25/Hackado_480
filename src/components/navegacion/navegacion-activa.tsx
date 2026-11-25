"use client";

import { usePathname } from "next/navigation";
import { BarraInferior } from "./barra-inferior";
import { BarraLateral } from "./barra-lateral";

/*
 * Leen la ruta actual para marcar el destino activo. Con Cache Components, usePathname puede
 * suspender en rutas dinámicas que no se prerenderizan: el layout las envuelve en <Suspense>
 * con la misma barra sin destino activo como fallback.
 */

export function BarraLateralActiva() {
  return <BarraLateral pathname={usePathname()} />;
}

export function BarraInferiorActiva() {
  return <BarraInferior pathname={usePathname()} />;
}
