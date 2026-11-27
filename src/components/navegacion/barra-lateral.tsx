import { Marca } from "@/components/marca";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BotonCerrarSesion } from "./cerrar-sesion";
import { BotonCreditos } from "./creditos";
import { BotonInstalar } from "@/components/pwa/boton-instalar";
import { type Destino, destinosPrincipales, destinosSecundariosPara, esDestinoActivo, type RolNavegacion } from "./destinos";

// Sobre el fondo oscuro, el foco y la línea del destino activo van en verde (12:1 sobre carbón).
const CLASE_ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-sm border-l-4 px-3 py-2 text-left text-base font-medium transition-colors duration-150 ease-in-out outline-none hover:bg-surface-darker focus-visible:ring-3 focus-visible:ring-sidebar-ring";

function ItemLateral({ destino, pathname }: { destino: Destino; pathname: string | null }) {
  const Icono = destino.icono;
  const activo = destino.href ? esDestinoActivo(pathname, destino.href) : false;
  const clase = cn(
    CLASE_ITEM,
    activo ? "border-brand bg-surface-darker font-bold text-white" : "border-transparent text-white/80 hover:text-white",
  );
  const contenido = (
    <>
      <Icono className="size-5 shrink-0" aria-hidden />
      {destino.etiqueta}
    </>
  );

  if (!destino.href) return <BotonCerrarSesion className={clase}>{contenido}</BotonCerrarSesion>;
  return (
    <Link href={destino.href} data-destino={destino.id} aria-current={activo ? "page" : undefined} className={clase}>
      {contenido}
    </Link>
  );
}

/**
 * Barra lateral fija de la web (≥ 1024 px): marca arriba, destinos principales y, al pie,
 * «Contáctanos», «Cerrar sesión» (invisible sin sesión) y «Créditos». Por debajo de `lg` la sustituye la barra inferior.
 */
export function BarraLateral({ pathname, rol = null }: { pathname: string | null; rol?: RolNavegacion }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-surface-dark px-3 py-5 text-white lg:flex">
      <Link
        href="/"
        className="flex min-h-11 items-center justify-center rounded-sm px-3 text-2xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring"
      >
        <Marca />
      </Link>

      <nav aria-label="Principal" className="flex flex-1 flex-col justify-between gap-6">
        <ul className="flex flex-col gap-1">
          {destinosPrincipales.map((d) => (
            <li key={d.id}>
              <ItemLateral destino={d} pathname={pathname} />
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
          {/* «Descarga la app» (PWA): solo aparece si el navegador permite instalarla; si no, el hueco desaparece. */}
          <li className="empty:hidden">
            <BotonInstalar className={cn(CLASE_ITEM, "border-transparent text-white/80 hover:text-white")} />
          </li>
          {destinosSecundariosPara(rol).map((d) => (
            // Sin sesión, «Cerrar sesión» guarda su hueco (no salta nada) pero no se ve ni se puede pulsar.
            <li key={d.id} className={cn(d.id === "cerrar-sesion" && !rol && "invisible")}>
              <ItemLateral destino={d} pathname={pathname} />
            </li>
          ))}
          <li>
            <BotonCreditos className="text-white/60 hover:text-white focus-visible:ring-sidebar-ring" />
          </li>
        </ul>
      </nav>
    </aside>
  );
}
