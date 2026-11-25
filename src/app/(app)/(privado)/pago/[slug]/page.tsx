import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { Checkout } from "@/components/pagos/checkout";
import { cargarCursoPublico } from "@/server/catalogo/servicio";

export const metadata: Metadata = { title: "Pago · 480 Academy" };

/** Pago simulado de un curso (issue #42). Pide sesión: proxy.ts y el layout de (privado). */
export default function PaginaPago({ params }: PageProps<"/pago/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <Suspense fallback={<EstadoCargando texto="Cargando el curso…" />}>
        <ContenidoPago params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoPago({ params }: { params: PageProps<"/pago/[slug]">["params"] }) {
  const { slug } = await params;
  const resultado = await cargarCursoPublico(slug);
  if (resultado.estado === "no-encontrado") notFound();
  if (resultado.estado === "error") {
    return (
      <EstadoError>
        No se ha podido cargar el curso. <AyudaBd />
      </EstadoError>
    );
  }

  const { curso } = resultado;
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/cursos/${curso.slug}`}
          className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in-out hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al curso
        </Link>
        <h1 className="text-3xl leading-tight font-bold md:text-4xl">Finalizar compra</h1>
      </div>
      <Checkout
        curso={{ slug: curso.slug, titulo: curso.titulo, categoria: curso.categoria.nombre, numModulos: curso.numModulos }}
        precioCentimos={curso.precioCentimos}
      />
    </>
  );
}
