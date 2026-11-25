import type { Metadata } from "next";
import { Suspense } from "react";
import { CabeceraAcceso } from "@/components/auth/cabecera-acceso";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { Resaltado } from "@/components/auth/resaltado";
import { EsqueletoFormulario } from "@/components/auth/esqueleto-formulario";
import { RedirigirSiHaySesion } from "../ya-con-sesion";

export const metadata: Metadata = { title: "Inicia sesión · 480 Academy" };

/**
 * Login simulado (issue #42). Se llega aquí desde una página que pide sesión, con `?volver=`.
 * Solo es el contenido del cajón: el cajón y el astronauta están en el layout de (acceso).
 */
export default function Login({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  return (
    <>
      <CabeceraAcceso titulo="Inicia sesión">
        Entra para seguir tus cursos y <Resaltado>hablar con tu tutor.</Resaltado>
      </CabeceraAcceso>
      <Suspense fallback={<EsqueletoFormulario variante="login" />}>
        <RedirigirSiHaySesion searchParams={searchParams} />
        <FormularioLogin />
      </Suspense>
    </>
  );
}
