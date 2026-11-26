import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CabeceraPantalla } from "@/components/cabecera-pantalla";
import { PantallaTestModulo } from "@/components/test-modulo/pantalla-test";
import { getModulo, getModulos } from "@/lib/catalogo";

export function generateStaticParams() {
  return getModulos().map((m) => ({ id: m.id }));
}

/**
 * Test del módulo (#3): entre 5 y 8 preguntas de su banco, corrección con la nota y el minuto del vídeo que hay que
 * repasar. La página es estática; las preguntas las pide el navegador a `/api/modulos/:id/test` al empezar.
 */
export default function TestModuloPage({ params }: PageProps<"/modulos/[id]/test">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-2xl">
      <Suspense fallback={<CabeceraPantalla seccion="Test del módulo" titulo="Cargando…" />}>
        <ContenidoTest params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoTest({ params }: { params: PageProps<"/modulos/[id]/test">["params"] }) {
  const { id } = await params;
  const modulo = getModulo(id);
  if (!modulo) notFound();

  return (
    <>
      <CabeceraPantalla seccion="Test del módulo" titulo={modulo.titulo} />
      <PantallaTestModulo moduloId={modulo.id} videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))} />
    </>
  );
}
