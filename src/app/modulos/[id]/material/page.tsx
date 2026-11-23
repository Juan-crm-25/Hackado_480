import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getModulo, getModulos } from "@/lib/catalogo";
import { leerInfografiasPublicadas } from "@/lib/infografias";
import { leerMaterialComunPublicado } from "@/lib/material";
import { VistaMaterial } from "./vista-material";

export function generateStaticParams() {
  return getModulos().map((m) => ({ id: m.id }));
}

/** Material común del módulo: resumen y tarjetas, igual para todos los alumnos (#2). */
export default function MaterialPage({ params }: PageProps<"/modulos/[id]/material">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <Suspense fallback={<Cabecera titulo="Cargando…" />}>
        <ContenidoMaterial params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoMaterial({ params }: { params: PageProps<"/modulos/[id]/material">["params"] }) {
  const { id } = await params;
  const modulo = getModulo(id);
  if (!modulo) notFound();
  return (
    <>
      <Cabecera titulo={modulo.titulo} />
      <VistaMaterial
        moduloId={modulo.id}
        material={leerMaterialComunPublicado(id)}
        infografias={leerInfografiasPublicadas(id)?.infografias ?? []}
        conceptos={modulo.conceptos}
        videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))}
        hayTranscripciones={modulo.videos.some((v) => v.transcripcion)}
        enlaceTutor={`/modulos/${modulo.id}/tutor`}
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
        <p className="text-xs text-muted-foreground">Material de repaso</p>
        <h1 className="truncate font-semibold">{titulo}</h1>
      </div>
    </header>
  );
}
