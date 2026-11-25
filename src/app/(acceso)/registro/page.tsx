import type { Metadata } from "next";
import { Suspense } from "react";
import { CabeceraAcceso } from "@/components/auth/cabecera-acceso";
import { FormularioRegistro } from "@/components/auth/formulario-registro";
import { Resaltado } from "@/components/auth/resaltado";
import { EstadoCargando } from "@/components/estado";
import { RedirigirSiHaySesion } from "../ya-con-sesion";

export const metadata: Metadata = { title: "Crea tu cuenta · 480 Academy" };

/**
 * Registro simulado (issue #42): toda cuenta nueva es de alumno.
 * Solo es el contenido del cajón: el cajón y el astronauta están en el layout de (acceso).
 */
export default function Registro({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  return (
    <>
      <CabeceraAcceso titulo="Crea tu cuenta">
        <Resaltado>Es gratis.</Resaltado> Después podrás apuntarte a los cursos que quieras.
      </CabeceraAcceso>
      <Suspense fallback={<EstadoCargando />}>
        <RedirigirSiHaySesion searchParams={searchParams} />
        <FormularioRegistro />
      </Suspense>
    </>
  );
}
