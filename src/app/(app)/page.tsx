import { Megaphone } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { CatalogoCursos } from "@/components/cursos/catalogo-cursos";
import type { CursoConValoracion } from "@/components/cursos/tarjeta-curso";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { anuncios } from "@/lib/demo/anuncios";
import { cursosDestacados, resumenValoraciones, valoracionesDe } from "@/lib/demo/valoraciones";
import { cargarCursosPublicados } from "@/server/catalogo/servicio";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm font-medium underline underline-offset-4";

// Franja decorativa de cada anuncio (docs/estilo.md, «Color con intención»).
const FRANJAS_ANUNCIO = ["bg-chart-2", "bg-chart-5"];

/**
 * Home pública de la academia: presentación, anuncios, buscador con filtro y el catálogo de cursos.
 * La presentación y los anuncios van en el esqueleto estático; los cursos salen de la BBDD en cada petición,
 * dentro de <Suspense> (Cache Components), así `next build` no necesita BBDD.
 * Los anuncios, los destacados y las valoraciones son datos de ejemplo del MVP (src/lib/demo/).
 */
export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <section
        aria-labelledby="academia"
        className="flex flex-col gap-4 rounded-lg bg-surface-dark p-5 text-white md:p-8"
      >
        <h1 id="academia" className="text-3xl leading-tight font-bold md:text-4xl">
          Aprende a tu ritmo, con un tutor que te acompaña
        </h1>
        <p className="max-w-prose text-base text-white/80">
          Cursos en vídeo de programación, IA, cocina, costura y oposiciones, con material de repaso y un tutor con IA
          para resolver tus dudas.
        </p>
        <div>
          <a href="#catalogo" className={buttonVariants({ variant: "accent", size: "lg" })}>
            Explorar cursos
          </a>
        </div>
      </section>

      <section aria-labelledby="anuncios" className="flex flex-col gap-3">
        <h2 id="anuncios" className="text-2xl leading-tight font-bold">
          Novedades
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {anuncios.map((a, i) => (
            <li key={a.id} className="flex">
              <Card className="flex-1 pt-0">
                <div aria-hidden className={`h-1.5 ${FRANJAS_ANUNCIO[i % FRANJAS_ANUNCIO.length]}`} />
                <CardHeader className="flex flex-1 flex-col gap-2">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Megaphone className="size-4" aria-hidden />
                    Anuncio
                  </p>
                  <CardTitle>
                    <h3 className="text-lg leading-tight font-bold">{a.titulo}</h3>
                  </CardTitle>
                  <CardDescription>{a.texto}</CardDescription>
                  <div className="mt-auto">
                    <Link href={a.href} className={CLASE_ENLACE}>
                      {a.cta}
                    </Link>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section id="catalogo" aria-labelledby="titulo-catalogo" className="flex scroll-mt-4 flex-col gap-4">
        <h2 id="titulo-catalogo" className="text-2xl leading-tight font-bold">
          Nuestros cursos
        </h2>
        <Suspense fallback={<EstadoCargando texto="Cargando los cursos…" />}>
          <Catalogo />
        </Suspense>
      </section>
    </main>
  );
}

async function Catalogo() {
  await connection(); // los cursos se leen en cada petición, nunca durante el build
  const resultado = await cargarCursosPublicados();
  if (resultado.estado === "error") {
    return (
      <EstadoError>
        No se han podido cargar los cursos. <AyudaBd />
      </EstadoError>
    );
  }
  if (resultado.estado === "vacio") {
    return (
      <EstadoVacio>
        Todavía no hay ningún curso publicado. <AyudaBd />
      </EstadoVacio>
    );
  }

  const cursos: CursoConValoracion[] = resultado.cursos.map((c) => {
    const { media, total } = resumenValoraciones(valoracionesDe(c.slug));
    return { ...c, valoracion: { media, total } };
  });
  return <CatalogoCursos cursos={cursos} destacados={cursosDestacados} />;
}
