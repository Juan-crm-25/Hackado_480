import Link from "next/link";
import { notFound } from "next/navigation";
import { getModulo, getModulos } from "@/lib/catalogo";
import { ChatTutor } from "./chat-tutor";

export function generateStaticParams() {
  return getModulos().map((m) => ({ id: m.id }));
}

export default async function TutorPage({ params }: PageProps<"/modulos/[id]/tutor">) {
  const { id } = await params;
  const modulo = getModulo(id);
  if (!modulo) notFound();

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/" className="text-sm text-muted-foreground" aria-label="Volver al curso">
          ← Curso
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Tutor del módulo</p>
          <h1 className="truncate font-semibold">{modulo.titulo}</h1>
        </div>
      </header>
      <ChatTutor
        moduloId={modulo.id}
        videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))}
        sugerencias={modulo.conceptos.map((c) => `Explícame: ${c.nombre.toLowerCase()}`)}
      />
    </main>
  );
}
