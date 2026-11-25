import { BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CabeceraPantalla } from "@/components/cabecera-pantalla";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { VideoYoutube } from "@/components/video-youtube";
import type { ClaseCatalogo } from "@/lib/catalogo-bd";
import { duracionAccesible, duracionVideo } from "@/lib/youtube";
import { buscarModulo, cargarCursoPrincipal } from "@/server/catalogo/servicio";

/**
 * Pantalla «Módulo»: descripción, conceptos y vídeos de las clases, con enlaces al material y al tutor.
 * Sin generateStaticParams: el módulo se lee de la BBDD en cada petición, dentro de <Suspense>
 * (Cache Components), así `next build` no necesita BBDD.
 */
export default function ModuloPage({ params }: PageProps<"/modulos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-2xl">
      <Suspense
        fallback={
          <>
            <CabeceraPantalla seccion="Módulo" titulo="Cargando…" />
            <EstadoCargando className="px-4 py-6" texto="Cargando el módulo…" />
          </>
        }
      >
        <ContenidoModulo params={params} />
      </Suspense>
    </main>
  );
}

function AyudaBd() {
  return (
    <>
      Arranca la base de datos con <code className="font-mono">npm run db:up</code> y carga los datos de ejemplo con{" "}
      <code className="font-mono">npm run db:seed</code>.
    </>
  );
}

async function ContenidoModulo({ params }: { params: PageProps<"/modulos/[id]">["params"] }) {
  await connection(); // el módulo se lee en cada petición, nunca durante el build
  const { id } = await params;
  const resultado = await cargarCursoPrincipal();

  if (resultado.estado !== "ok") {
    return (
      <>
        <CabeceraPantalla seccion="Módulo" titulo="Sin datos" />
        <div className="px-4 py-6">
          {resultado.estado === "error" ? (
            <EstadoError>
              No se ha podido cargar el módulo. <AyudaBd />
            </EstadoError>
          ) : (
            <EstadoVacio>
              Todavía no hay ningún curso. <AyudaBd />
            </EstadoVacio>
          )}
        </div>
      </>
    );
  }

  const modulo = buscarModulo(resultado.curso, id);
  if (!modulo) notFound();

  return (
    <>
      <CabeceraPantalla seccion="Módulo" titulo={modulo.titulo} />
      <div className="flex flex-col gap-6 px-4 py-6">
        <p className="text-base text-muted-foreground">{modulo.descripcion}</p>

        {modulo.conceptos.length > 0 && (
          <section aria-labelledby="conceptos" className="flex flex-col gap-2">
            <h2 id="conceptos" className="text-lg leading-tight font-bold">
              Conceptos
            </h2>
            <ul className="flex flex-wrap gap-2">
              {modulo.conceptos.map((c) => (
                <li key={c.id}>
                  <Badge variant="secondary" className="h-auto whitespace-normal">
                    {c.nombre}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="videos" className="flex flex-col gap-3">
          <h2 id="videos" className="text-lg leading-tight font-bold">
            Vídeos
          </h2>
          {modulo.clases.length === 0 ? (
            <EstadoVacio>Este módulo todavía no tiene vídeos.</EstadoVacio>
          ) : (
            <ol className="flex flex-col gap-6">
              {modulo.clases.map((clase, i) => (
                <li key={clase.id}>
                  <ClaseVideo clase={clase} numero={i + 1} />
                </li>
              ))}
            </ol>
          )}
        </section>

        <nav aria-label="Seguir con el módulo" className="flex flex-col gap-3 md:flex-row">
          <Link href={`/modulos/${modulo.id}/material`} className={buttonVariants({ variant: "accent", size: "lg" })}>
            <BookOpen aria-hidden />
            Material de repaso
          </Link>
          <Link href={`/modulos/${modulo.id}/tutor`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            <MessageCircle aria-hidden />
            Preguntar al tutor
          </Link>
        </nav>
      </div>
    </>
  );
}

function ClaseVideo({ clase, numero }: { clase: ClaseCatalogo; numero: number }) {
  return (
    <article className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">
          <span className="text-muted-foreground">{numero}.</span> {clase.titulo}
        </h3>
        <p className="shrink-0 text-sm text-muted-foreground">
          <span aria-hidden>{duracionVideo(clase.duracionSegundos)}</span>
          <span className="sr-only">Duración: {duracionAccesible(clase.duracionSegundos)}</span>
        </p>
      </div>
      {clase.youtubeId ? (
        <VideoYoutube youtubeId={clase.youtubeId} titulo={clase.titulo} />
      ) : (
        <EstadoVacio>
          Este vídeo no se puede incrustar.{" "}
          <a href={clase.videoUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            Ábrelo en una pestaña nueva
          </a>
          .
        </EstadoVacio>
      )}
    </article>
  );
}
