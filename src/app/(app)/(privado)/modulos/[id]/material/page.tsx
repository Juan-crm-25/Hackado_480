import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CabeceraPantalla } from "@/components/cabecera-pantalla";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { getModulo } from "@/lib/catalogo";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { ErrorApp } from "@/server/compartido/errores";
import { leerMaterialDelModulo } from "@/server/material/servicio";
import { VistaMaterial } from "./vista-material";

/**
 * Material común del módulo (#2, #7, #15): resumen, tarjetas e infografías de sus vídeos, igual para todos los alumnos
 * del curso. Se lee de la BBDD (material_clase, solo lo revisado) en cada petición, dentro de <Suspense>
 * (Cache Components), así `next build` no necesita BBDD.
 */
export default function MaterialPage({ params }: PageProps<"/modulos/[id]/material">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-2xl">
      <Suspense
        fallback={
          <>
            <CabeceraPantalla seccion="Material de repaso" titulo="Cargando…" />
            <EstadoCargando className="px-4 py-6" texto="Cargando el material…" />
          </>
        }
      >
        <ContenidoMaterial params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoMaterial({ params }: { params: PageProps<"/modulos/[id]/material">["params"] }) {
  await connection(); // el material se lee en cada petición, nunca durante el build
  const { id } = await params;
  const modulo = getModulo(id);
  if (!modulo) notFound();
  const usuario = await requerirUsuarioActual();

  const resultado = await leerMaterialDelModulo(usuario, modulo.id).then(
    (material) => ({ material }),
    (error: unknown) => ({ error }),
  );

  if ("error" in resultado) {
    const { error } = resultado;
    if (error instanceof ErrorApp && error.codigo === "NO_ENCONTRADO") notFound();
    return (
      <>
        <CabeceraPantalla seccion="Material de repaso" titulo={modulo.titulo} />
        <div className="px-4 py-6">
          {error instanceof ErrorApp && error.codigo === "PROHIBIDO" ? (
            <EstadoVacio>Necesitas tener este curso para ver su material de repaso.</EstadoVacio>
          ) : (
            <EstadoError>
              No se ha podido cargar el material. Arranca la base de datos con <code className="font-mono">npm run db:up</code>.
            </EstadoError>
          )}
        </div>
      </>
    );
  }

  const { material } = resultado;
  return (
    <>
      <CabeceraPantalla seccion="Material de repaso" titulo={modulo.titulo} />
      <VistaMaterial
        moduloId={modulo.id}
        resumen={material.resumen}
        tarjetas={material.tarjetas}
        infografias={material.infografias}
        conceptos={modulo.conceptos}
        videos={modulo.videos.map((v) => ({ id: v.id, titulo: v.titulo, youtubeId: v.youtubeId }))}
        hayTranscripciones={modulo.videos.some((v) => v.transcripcion)}
        enlaceTutor={`/modulos/${modulo.id}/tutor`}
      />
    </>
  );
}
