import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CabeceraPantalla } from "@/components/cabecera-pantalla";
import { getModulo, getModulos } from "@/lib/catalogo";
import { ChatTutor } from "./chat-tutor";

export function generateStaticParams() {
  return getModulos().map((m) => ({ id: m.id }));
}

/**
 * La página en sí es estática (el "esqueleto" sale al instante al navegar) y lo que depende
 * del módulo de la URL va dentro de <Suspense>, como pide Next.js 16 con Cache Components.
 */
export default function TutorPage({ params }: PageProps<"/modulos/[id]/tutor">) {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <Suspense fallback={<CabeceraPantalla seccion="Tutor del módulo" titulo="Cargando…" />}>
        <ContenidoTutor params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoTutor({ params }: { params: PageProps<"/modulos/[id]/tutor">["params"] }) {
  const { id } = await params;
  const modulo = getModulo(id);
  if (!modulo) notFound();

  return (
    <>
      <CabeceraPantalla seccion="Tutor del módulo" titulo={modulo.titulo} />
      <ChatTutor
        moduloId={modulo.id}
        videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))}
        sugerencias={modulo.conceptos.map((c) => `Explícame: ${c.nombre.toLowerCase()}`)}
      />
    </>
  );
}
