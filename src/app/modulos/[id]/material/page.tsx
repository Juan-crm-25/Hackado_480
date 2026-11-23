import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getModulo, getModulos } from "@/lib/catalogo";
import { leerMaterialComun } from "@/lib/material";
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
  const material = leerMaterialComun(id);

  return (
    <>
      <Cabecera titulo={modulo.titulo} />
      {material ? (
        <VistaMaterial
          material={material}
          videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))}
          enlaceTutor={`/modulos/${modulo.id}/tutor`}
        />
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground">Este módulo todavía no tiene material de repaso.</p>
      )}
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
