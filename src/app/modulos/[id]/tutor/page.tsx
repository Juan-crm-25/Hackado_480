import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
      <Suspense fallback={<Cabecera titulo="Cargando…" />}>
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
      <Cabecera titulo={modulo.titulo} />
      <ChatTutor
        moduloId={modulo.id}
        videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))}
        sugerencias={modulo.conceptos.map((c) => `Explícame: ${c.nombre.toLowerCase()}`)}
      />
    </>
  );
}

function Cabecera({ titulo }: { titulo: string }) {
  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <Link href="/" className="text-sm text-muted-foreground" aria-label="Volver al curso">
        ← Curso
      </Link>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Tutor del módulo</p>
        <h1 className="truncate font-semibold">{titulo}</h1>
      </div>
    </header>
  );
}
