"use client";

import { Download, Share, SquarePlus } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  type AvisoInstalacion,
  esIos,
  estadoInstalacion,
  type EstadoInstalacion,
  guardarAviso,
  hayAviso,
  instalar,
  olvidarAviso,
  suscribirAviso,
} from "@/lib/pwa/instalacion";

// El aviso de «se puede instalar» llega una vez y puede llegar antes de pintar el menú: se escucha desde que carga.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault(); // sin la barrita del navegador: se instala desde nuestro botón
    guardarAviso(evento as unknown as AvisoInstalacion);
  });
  window.addEventListener("appinstalled", () => olvidarAviso());
}

function estadoEnNavegador(): EstadoInstalacion {
  const instalada =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return estadoInstalacion({ instalada, ios: esIos(navigator.userAgent, navigator.maxTouchPoints ?? 0), hayAviso: hayAviso() });
}

/**
 * «Descarga la app»: instala la PWA sin ir a los ajustes del navegador (ver src/lib/pwa/instalacion.ts).
 * En el servidor no se pinta: lo que se puede hacer depende del navegador y se decide al cargar.
 */
export function BotonInstalar({ className }: { className?: string }) {
  const estado = useSyncExternalStore(suscribirAviso, estadoEnNavegador, () => "no_disponible" as const);
  return <BotonInstalarVista estado={estado} onInstalar={() => void instalar()} className={className} />;
}

/** Lo que se ve en cada caso: botón que instala, botón con los pasos de iPhone, o nada. */
export function BotonInstalarVista({
  estado,
  onInstalar,
  className,
}: {
  estado: EstadoInstalacion;
  onInstalar: () => void;
  className?: string;
}) {
  const contenido = (
    <>
      <Download className="size-5 shrink-0" aria-hidden />
      Descarga la app
    </>
  );

  if (estado === "disponible") {
    return (
      <button type="button" data-accion="instalar" className={className} onClick={onInstalar}>
        {contenido}
      </button>
    );
  }

  if (estado === "ios") {
    return (
      <Dialog>
        <DialogTrigger data-accion="instalar" className={className}>
          {contenido}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Añade 480 Academy a tu pantalla de inicio</DialogTitle>
            <DialogDescription>En iPhone y iPad se instala desde Safari, en dos pasos:</DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-2">
              <Share className="size-5 shrink-0" aria-hidden />
              1. Pulsa «Compartir» en la barra de Safari.
            </li>
            <li className="flex items-center gap-2">
              <SquarePlus className="size-5 shrink-0" aria-hidden />
              2. Elige «Añadir a pantalla de inicio».
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
