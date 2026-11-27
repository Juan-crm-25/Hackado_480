"use client";

import { useEffect } from "react";
import { registrarServiceWorker } from "@/lib/pwa/registro";

/** Registra el service worker de la PWA al cargar (solo en producción; ver src/lib/pwa/registro.ts). No pinta nada. */
export function RegistroServiceWorker() {
  useEffect(() => {
    registrarServiceWorker({ produccion: process.env.NODE_ENV === "production", navegador: navigator });
  }, []);
  return null;
}
