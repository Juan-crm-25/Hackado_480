"use client";

import { usePathname } from "next/navigation";
import { BarraInferior } from "./barra-inferior";
import { BarraLateral } from "./barra-lateral";
import type { RolNavegacion } from "./destinos";

/*
 * Leen la ruta actual para marcar el destino activo. Con Cache Components, usePathname puede
 * suspender en rutas dinámicas que no se prerenderizan: el layout las envuelve en <Suspense>
 * con la misma barra sin destino activo como fallback.
 */

export function BarraLateralActiva({ rol = null }: { rol?: RolNavegacion }) {
  return <BarraLateral pathname={usePathname()} rol={rol} />;
}

export function BarraInferiorActiva({ rol = null }: { rol?: RolNavegacion }) {
  return <BarraInferior pathname={usePathname()} rol={rol} />;
}
