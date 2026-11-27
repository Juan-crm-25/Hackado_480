"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Vuelve a cargar la página: si ya hay red, el service worker la trae de nuevo. */
export function BotonReintentar() {
  return (
    <Button type="button" variant="accent" size="lg" onClick={() => window.location.reload()}>
      <RotateCw aria-hidden />
      Reintentar
    </Button>
  );
}
