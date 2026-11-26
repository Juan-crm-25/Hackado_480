"use client";

import { Heart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ENLACE_ASTRONAUTA =
  "https://www.magnific.com/es/vector-gratis/lindo-astronauta-montando-cohete-agitando-mano-icono-dibujos-animados-ilustracion-concepto-icono-tecnologia-ciencia_10764053.htm#fromView=search&page=1&position=0&uuid=0386de25-b20c-445a-b6d3-d8d185e2898c&track=ais_hybrid&query=Astronauta+svg";

// Enlace externo con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm underline underline-offset-4 hover:text-foreground";

/** Material de terceros que usa la app y a quién se lo agradecemos. La atribución del astronauta es la que pide Magnific. */
export function ContenidoCreditos() {
  return (
    <ul className="flex flex-col gap-3 text-sm">
      <li className="flex flex-col gap-1">
        <span className="font-semibold">Ilustraciones de los astronautas</span>
        <span className="text-muted-foreground">
          El del cohete (al cerrar sesión), el de los cohetes (Cyber Monday) y el cocinero (Navidad).
        </span>
        <a href={ENLACE_ASTRONAUTA} target="_blank" rel="noopener noreferrer" className={CLASE_ENLACE}>
          Imagen de catalyststuff en Magnific
        </a>
      </li>
      <li className="flex flex-col gap-1">
        <span className="font-semibold">Vídeos del curso de desarrollo web</span>
        <span className="text-muted-foreground">
          Kiko Palomares (HTML, maquetación y JavaScript) y Dorian Desings (CSS), en YouTube.
        </span>
      </li>
      <li className="flex flex-col gap-1">
        <span className="font-semibold">Iconos</span>
        <span className="text-muted-foreground">Lucide (licencia ISC) y Simple Icons (CC0) para los logos de las redes.</span>
      </li>
    </ul>
  );
}

/**
 * «Créditos»: botón pequeño al pie de la navegación (debajo de «Cerrar sesión») que abre una ventana dando las
 * gracias por el material usado. Texto pequeño, pero con la zona táctil de 44 px que pide la guía.
 */
export function BotonCreditos({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger
        data-accion="creditos"
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-xs font-medium transition-colors duration-150 ease-in-out outline-none focus-visible:ring-3",
          className,
        )}
      >
        <Heart className="size-3.5 shrink-0" aria-hidden />
        Créditos
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Gracias por el material</DialogTitle>
          <DialogDescription>
            480 Academy se apoya en el trabajo de estas personas y proyectos. ¡Gracias por compartirlo!
          </DialogDescription>
        </DialogHeader>
        <ContenidoCreditos />
      </DialogContent>
    </Dialog>
  );
}
