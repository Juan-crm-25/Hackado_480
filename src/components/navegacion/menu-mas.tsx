"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BotonCerrarSesion } from "./cerrar-sesion";
import { BotonCreditos } from "./creditos";
import { BotonInstalar } from "@/components/pwa/boton-instalar";
import { type Destino, destinosSecundariosPara, esDestinoActivo, type RolNavegacion } from "./destinos";

const CLASE_ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-base font-medium transition-colors duration-150 ease-in-out outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring";

function ItemSecundario({
  destino,
  pathname,
  onElegir,
}: {
  destino: Destino;
  pathname: string | null;
  onElegir?: () => void;
}) {
  const Icono = destino.icono;
  const contenido = (
    <>
      <Icono className="size-5 shrink-0" aria-hidden />
      {destino.etiqueta}
    </>
  );
  if (!destino.href) {
    return (
      <BotonCerrarSesion className={CLASE_ITEM} onCerrar={onElegir}>
        {contenido}
      </BotonCerrarSesion>
    );
  }
  const activo = esDestinoActivo(pathname, destino.href);
  return (
    <Link
      href={destino.href}
      data-destino={destino.id}
      aria-current={activo ? "page" : undefined}
      onClick={onElegir}
      className={cn(CLASE_ITEM, activo && "font-bold underline underline-offset-4")}
    >
      {contenido}
    </Link>
  );
}

/** Destinos secundarios del menú «Más» (en web están al pie de la barra lateral). */
export function ListaSecundarios({
  pathname,
  onElegir,
  rol = null,
}: {
  pathname: string | null;
  onElegir?: () => void;
  rol?: RolNavegacion;
}) {
  return (
    <ul className="flex flex-col gap-1 px-2 pb-4">
      {/* «Descarga la app» (PWA): solo aparece si el navegador permite instalarla; si no, el hueco desaparece. */}
      <li className="empty:hidden">
        <BotonInstalar className={CLASE_ITEM} />
      </li>
      {destinosSecundariosPara(rol).map((d) => (
        // Sin sesión, «Cerrar sesión» guarda su hueco (no salta nada) pero no se ve ni se puede pulsar.
        <li key={d.id} className={cn(d.id === "cerrar-sesion" && !rol && "invisible")}>
          <ItemSecundario destino={d} pathname={pathname} onElegir={onElegir} />
        </li>
      ))}
      <li>
        <BotonCreditos className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring" />
      </li>
    </ul>
  );
}

/** Cuarta pestaña de la barra inferior: abre un panel desde abajo con los destinos secundarios. */
export function MenuMas({ pathname, className, rol = null }: { pathname: string | null; className?: string; rol?: RolNavegacion }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger className={className}>
        <Ellipsis className="size-5" aria-hidden />
        <span>Más</span>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Más</SheetTitle>
          <SheetDescription className="sr-only">Perfil, contacto y cierre de sesión</SheetDescription>
        </SheetHeader>
        <ListaSecundarios pathname={pathname} rol={rol} onElegir={() => setAbierto(false)} />
      </SheetContent>
    </Sheet>
  );
}
