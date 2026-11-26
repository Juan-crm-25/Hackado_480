import { connection } from "next/server";
import { Suspense } from "react";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { DudasParaResponder } from "@/components/radar/dudas-para-responder";
import { VistaRadar } from "@/components/radar/vista-radar";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { ErrorApp } from "@/server/compartido/errores";
import { obtenerRadar } from "@/server/radar/servicio";
import { listarDudasHumanasDelCurso } from "@/server/tutor/servicio";

/**
 * Radar del tutor (/radar?curso=<slug>, #5): solo para el profesor de ese curso o un admin.
 * Sin `curso`, el de la demo. Lee la sesión y la BBDD en cada petición, dentro de <Suspense> (Cache Components).
 */
export default function RadarPage({ searchParams }: PageProps<"/radar">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <Suspense fallback={<EstadoCargando texto="Cargando el Radar…" />}>
        <ContenidoRadar searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ContenidoRadar({ searchParams }: { searchParams: PageProps<"/radar">["searchParams"] }) {
  const usuario = await requerirUsuarioActual();
  const { curso } = await searchParams;
  const slug = typeof curso === "string" && curso ? curso : CURSO_DEMO_SLUG;

  if (usuario.rol === "alumno") {
    return <EstadoVacio>El Radar es para los profesores del curso: les dice qué alumnos necesitan ayuda.</EstadoVacio>;
  }

  await connection();
  const resultado = await obtenerRadar(usuario, slug).then(
    (informe) => ({ informe }),
    (error: unknown) => ({ error }),
  );
  if ("informe" in resultado) {
    // Las dudas para responder (H9) van aparte: si fallan, el resto del Radar se ve igual.
    const dudas = await listarDudasHumanasDelCurso(usuario, slug).catch((e: unknown) => {
      console.error(e);
      return null;
    });
    const ahora = new Date();
    return (
      <>
        <DudasParaResponder dudasIniciales={dudas} ahora={ahora} />
        <VistaRadar informe={resultado.informe} ahora={ahora} />
      </>
    );
  }

  const { error } = resultado;
  if (error instanceof ErrorApp && error.codigo === "PROHIBIDO") {
    return <EstadoVacio>Solo el profesor de este curso puede ver su Radar.</EstadoVacio>;
  }
  if (error instanceof ErrorApp && error.codigo === "NO_ENCONTRADO") {
    return <EstadoVacio>No existe ese curso.</EstadoVacio>;
  }
  console.error(error);
  return <EstadoError>No se ha podido cargar el Radar. Inténtalo de nuevo en unos segundos.</EstadoError>;
}
