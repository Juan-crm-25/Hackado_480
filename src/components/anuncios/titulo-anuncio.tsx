import type { Anuncio } from "@/lib/demo/anuncios";
import { cn } from "@/lib/utils";

/**
 * Título de un anuncio de la home. Los de temporada llevan su letra (Orbitron o Mountains of Christmas, de
 * src/app/layout.tsx) y sus colores (tokens --promo-*): el Cyber Monday en degradado de azules y la Navidad en rojo.
 * Van en `text-2xl`: con texto grande basta 3:1 de contraste, y los tokens superan 4,5:1 sobre la tarjeta.
 */
const ESTILOS: Record<NonNullable<Anuncio["estilo"]>, string> = {
  cyber:
    "font-cyber text-2xl font-bold tracking-wide bg-linear-to-r from-promo-cyber-1 to-promo-cyber-2 bg-clip-text text-transparent",
  navidad: "font-navidad text-2xl font-bold text-promo-navidad",
};

export function TituloAnuncio({ titulo, estilo }: { titulo: string; estilo?: Anuncio["estilo"] }) {
  return <h3 className={estilo ? cn(ESTILOS[estilo], "text-center leading-tight") : "text-lg leading-tight font-bold"}>{titulo}</h3>;
}
