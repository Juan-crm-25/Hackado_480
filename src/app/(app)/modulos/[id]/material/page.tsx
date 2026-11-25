import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CabeceraPantalla } from "@/components/cabecera-pantalla";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-2xl">
      <Suspense fallback={<CabeceraPantalla seccion="Material de repaso" titulo="Cargando…" />}>
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
      <CabeceraPantalla seccion="Material de repaso" titulo={modulo.titulo} />
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
