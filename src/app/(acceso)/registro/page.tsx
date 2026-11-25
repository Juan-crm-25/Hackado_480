import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioRegistro } from "@/components/auth/formulario-registro";
import { EstadoCargando } from "@/components/estado";
import { RedirigirSiHaySesion } from "../ya-con-sesion";

export const metadata: Metadata = { title: "Crea tu cuenta · 480 Academy" };

/** Registro simulado (issue #42): toda cuenta nueva es de alumno. */
export default function Registro({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight font-bold">Crea tu cuenta</h1>
        <p className="text-muted-foreground">Es gratis. Después podrás apuntarte a los cursos que quieras.</p>
      </header>
      <Suspense fallback={<EstadoCargando />}>
        <RedirigirSiHaySesion searchParams={searchParams} />
        <FormularioRegistro />
      </Suspense>
    </>
  );
}
