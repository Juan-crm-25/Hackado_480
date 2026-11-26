import { BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CabeceraPantalla } from "@/components/cabecera-pantalla";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { IrAlForo } from "@/components/foro/ir-al-foro";
import { SeccionForo } from "@/components/foro/seccion-foro";
import { VideosModulo } from "@/components/modulo/videos-modulo";
import { TarjetaProfesor } from "@/components/profesor/tarjeta-profesor";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { profesorDelCurso } from "@/lib/demo/profesores";
import { cn } from "@/lib/utils";
import { buscarModulo, cargarCursoPrincipal } from "@/server/catalogo/servicio";

/**
 * Pantalla «Módulo»: descripción, conceptos y vídeos de las clases (acordeón con «visto» y progreso),
 * con enlaces al material y al tutor (uno al lado del otro, con el mismo peso), la tarjeta de su profesor
 * (datos de demostración, con «Enviar mensaje» a la bandeja simulada del MVP)
 * y el foro del módulo al pie («Ir al foro», arriba, baja hasta él).
 * Sin generateStaticParams: el módulo se lee de la BBDD en cada petición, dentro de <Suspense>
 * (Cache Components), así `next build` no necesita BBDD.
 */
export default function ModuloPage({ params }: PageProps<"/modulos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-2xl">
      <Suspense
        fallback={
          <>
            <CabeceraPantalla seccion="Módulo" titulo="Cargando…" compartir />
            <EstadoCargando className="px-4 py-6" texto="Cargando el módulo…" />
          </>
        }
      >
        <ContenidoModulo params={params} />
      </Suspense>
    </main>
  );
}

/** Botones de «Material de repaso» y «Preguntar al tutor (IA)»: altura mínima de 44 px y texto en dos líneas si no cabe. */
const accionModulo = "h-auto min-h-11 py-2 text-center whitespace-normal";

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
        <CabeceraPantalla seccion="Módulo" titulo="Sin datos" compartir />
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
      <CabeceraPantalla seccion="Módulo" titulo={modulo.titulo} compartir />
      <div className="flex flex-col gap-6 px-4 py-6">
        <div className="flex flex-col items-start gap-3">
          <p className="text-base text-muted-foreground">{modulo.descripcion}</p>
          <IrAlForo />
        </div>

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
            <VideosModulo cursoSlug={resultado.curso.id} moduloSlug={modulo.id} clases={modulo.clases} />
          )}
        </section>

        {/* Mismo peso para los dos («Ir al foro» es el único botón verde). Lado a lado también a 360 px: el texto baja de línea si no cabe. */}
        <nav aria-label="Seguir con el módulo" className="grid grid-cols-2 gap-3">
          <Link href={`/modulos/${modulo.id}/material`} className={cn(buttonVariants({ variant: "outline" }), accionModulo)}>
            <BookOpen aria-hidden />
            Material de repaso
          </Link>
          <Link href={`/modulos/${modulo.id}/tutor`} className={cn(buttonVariants({ variant: "outline" }), accionModulo)}>
            <MessageCircle aria-hidden />
            Preguntar al tutor (IA)
          </Link>
        </nav>

        <TarjetaProfesor profesor={profesorDelCurso(resultado.curso.id)} />

        {/* El id del curso del catálogo es su slug (catalogo/repositorio.ts), y el del módulo, el suyo. */}
        <SeccionForo cursoSlug={resultado.curso.id} moduloSlug={modulo.id} />
      </div>
    </>
  );
}
