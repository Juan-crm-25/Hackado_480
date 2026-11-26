import { Megaphone } from "lucide-react";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Anuncio } from "@/lib/demo/anuncios";
import { cn } from "@/lib/utils";
import { TituloAnuncio } from "./titulo-anuncio";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm font-medium underline underline-offset-4";

// Franja decorativa de cada anuncio (docs/estilo.md, «Color con intención»).
const FRANJAS_ANUNCIO = ["bg-chart-2", "bg-chart-5"];

// Anuncios de temporada: sin borde ni franja, con una sombra corta alrededor (sin desplazamiento) del color de su título.
const SOMBRAS: Record<NonNullable<Anuncio["estilo"]>, string> = {
  cyber: "border-0 pt-6 shadow-[0_0_0.75rem] shadow-promo-cyber-1/40",
  navidad: "border-0 pt-6 shadow-[0_0_0.75rem] shadow-promo-navidad/40",
};

/**
 * Tarjeta de un anuncio de la home. Si lleva ilustración (un astronauta), va abajo a la derecha, algo separada del borde,
 * por debajo del contenido (z-10) y sin captar clics; el texto y el enlace dejan su hueco (pr-24) para no pisarla.
 * Ilustraciones: catalyststuff en Magnific (ver «Créditos»).
 */
export function TarjetaAnuncio({ anuncio, indice }: { anuncio: Anuncio; indice: number }) {
  const hueco = anuncio.ilustracion ? "pr-24 md:pr-32" : undefined;
  return (
    // Con franja, la tarjeta empieza sin relleno arriba (pt-0) para que la franja toque el borde.
    <Card className={cn("relative flex-1 overflow-hidden", anuncio.estilo ? SOMBRAS[anuncio.estilo] : "pt-0")}>
      {!anuncio.estilo && <div aria-hidden className={`h-1.5 ${FRANJAS_ANUNCIO[indice % FRANJAS_ANUNCIO.length]}`} />}
      <CardHeader className="relative z-10 flex flex-1 flex-col gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Megaphone className="size-4" aria-hidden />
          Anuncio
        </p>
        <CardTitle>
          <TituloAnuncio titulo={anuncio.titulo} estilo={anuncio.estilo} />
        </CardTitle>
        <CardDescription className={hueco}>{anuncio.texto}</CardDescription>
        <div className={cn("mt-auto", hueco)}>
          <Link href={anuncio.href} className={CLASE_ENLACE}>
            {anuncio.cta}
          </Link>
        </div>
      </CardHeader>
      {/* Detrás del contenido y no el primer hijo: Card quita el relleno de arriba si empieza por una <img>. */}
      {anuncio.ilustracion && (
        // eslint-disable-next-line @next/next/no-img-element -- SVG local decorativo: no necesita la optimización de next/image
        <img
          src={anuncio.ilustracion}
          alt=""
          width={88}
          height={104}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute right-3 bottom-0 h-24 w-auto md:right-5 md:h-28"
        />
      )}
    </Card>
  );
}
