import Link from "next/link";
import { cn } from "@/lib/utils";
import { destinosPrincipales, esDestinoActivo, type RolNavegacion } from "./destinos";
import { MenuMas } from "./menu-mas";

// Cada pestaña ocupa un cuarto del ancho y mide 64 px de alto (más de los 44 px táctiles).
const CLASE_PESTANA =
  "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors duration-150 ease-in-out outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset";

/**
 * Barra de pestañas inferior para móvil y tableta (< 1024 px): los 3 destinos principales y «Más».
 * El activo no se marca solo con color: texto en negrita y una línea encima del icono.
 */
export function BarraInferior({ pathname, rol = null }: { pathname: string | null; rol?: RolNavegacion }) {
  return (
    <nav aria-label="Principal" className="shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-3xl">
        {destinosPrincipales.map((d) => {
          const activo = esDestinoActivo(pathname, d.href);
          const Icono = d.icono;
          return (
            <li key={d.id} className="flex flex-1">
              <Link
                href={d.href}
                data-destino={d.id}
                aria-current={activo ? "page" : undefined}
                className={cn(CLASE_PESTANA, activo && "font-bold text-foreground")}
              >
                {activo && <span aria-hidden className="absolute top-0 h-1 w-10 rounded-b-sm bg-foreground" />}
                <Icono className="size-5" aria-hidden />
                <span>{d.etiqueta}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <MenuMas pathname={pathname} rol={rol} className={CLASE_PESTANA} />
        </li>
      </ul>
    </nav>
  );
}
