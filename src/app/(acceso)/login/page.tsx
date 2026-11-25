import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { EstadoCargando } from "@/components/estado";
import { RedirigirSiHaySesion } from "../ya-con-sesion";

export const metadata: Metadata = { title: "Inicia sesión · 480 Academy" };

/** Login simulado (issue #42). Se llega aquí desde una página que pide sesión, con `?volver=`. */
export default function Login({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight font-bold">Inicia sesión</h1>
        <p className="text-muted-foreground">Entra para seguir tus cursos y hablar con tu tutor.</p>
      </header>
      <Suspense fallback={<EstadoCargando />}>
        <RedirigirSiHaySesion searchParams={searchParams} />
        <FormularioLogin />
      </Suspense>
    </>
  );
}
