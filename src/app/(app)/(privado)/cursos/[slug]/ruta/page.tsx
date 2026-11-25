import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { ValorarModulos } from "@/components/ruta/valorar-modulos";
import { buttonVariants } from "@/components/ui/button";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { ErrorApp } from "@/server/compartido/errores";
import { obtenerRuta, type RutaDelCurso } from "@/server/matriculas/servicio";

export const metadata: Metadata = { title: "Personaliza tu ruta · 480 Academy" };

/** Ruta personalizada de un curso: el alumno valora cada módulo y el tutor le recomienda un orden. */
export default function PaginaRuta({ params }: PageProps<"/cursos/[slug]/ruta">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-2xl lg:px-8">
      <Suspense fallback={<EstadoCargando texto="Cargando los módulos…" />}>
        <ContenidoRuta params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoRuta({ params }: { params: PageProps<"/cursos/[slug]/ruta">["params"] }) {
  const { slug } = await params;
  const usuario = await requerirUsuarioActual();

  let ruta: RutaDelCurso;
  try {
    ruta = await obtenerRuta(usuario, slug);
  } catch (error) {
    if (error instanceof ErrorApp && error.codigo === "NO_ENCONTRADO") notFound();
    if (error instanceof ErrorApp && error.codigo === "PROHIBIDO") {
      return (
        <EstadoVacio
          acciones={
            <Link href={`/cursos/${slug}`} className={buttonVariants({ variant: "accent" })}>
              Ver el curso
            </Link>
          }
        >
          Para personalizar la ruta primero tienes que apuntarte al curso.
        </EstadoVacio>
      );
    }
    console.error(error);
    return <EstadoError>No se ha podido cargar el curso. Inténtalo de nuevo.</EstadoError>;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in-out hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Tus cursos
        </Link>
        <h1 className="text-3xl leading-tight font-bold md:text-4xl">Personaliza tu ruta</h1>
        <p className="max-w-prose text-muted-foreground">
          {ruta.curso.titulo}: dinos cuánto te interesa cada módulo y tu tutor te propondrá por dónde empezar. Nada se
          bloquea: podrás abrir cualquier módulo cuando quieras.
        </p>
      </div>
      <ValorarModulos slug={ruta.curso.slug} modulos={ruta.modulos} />
    </>
  );
}
