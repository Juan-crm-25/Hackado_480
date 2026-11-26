import { Suspense } from "react";
import { BarraInferior } from "@/components/navegacion/barra-inferior";
import { BarraLateral } from "@/components/navegacion/barra-lateral";
import { BarraSuperior } from "@/components/navegacion/barra-superior";
import { BarraInferiorActiva, BarraLateralActiva } from "@/components/navegacion/navegacion-activa";
import { AccesoUsuario } from "@/components/navegacion/avatar-usuario";
import { obtenerUsuarioActual } from "@/server/auth/usuario-actual";

/**
 * Marco de la app (docs/estilo.md, apartado 10, «Navegación de la app»).
 * Móvil y tableta: barra superior + contenido + barra inferior. Web (lg): barra lateral a la
 * izquierda + barra superior con el avatar + contenido. Las barras no se mueven: solo se desplaza
 * el contenido, así el chat del tutor puede ocupar el alto que queda entre ellas.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-sm bg-background px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-3 focus:ring-ring"
      >
        Saltar al contenido
      </a>

      <Suspense fallback={<BarraLateral pathname={null} />}>
        <BarraLateralConRol />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior
          usuario={
            <Suspense fallback={<span className="size-11" aria-hidden />}>
              <UsuarioDeLaSesion />
            </Suspense>
          }
        />
        {/* «relative»: los elementos absolutos del contenido (p. ej. los sr-only) se quedan dentro de este scroll y no estiran la página. */}
        <div id="contenido" className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
        <Suspense fallback={<BarraInferior pathname={null} />}>
          <BarraInferiorConRol />
        </Suspense>
      </div>
    </div>
  );
}

/** La navegación depende del rol (el Radar, solo para profesores y admin). Lee la sesión: va dentro de <Suspense>. */
async function BarraLateralConRol() {
  const usuario = await obtenerUsuarioActual();
  return <BarraLateralActiva rol={usuario?.rol ?? null} />;
}

async function BarraInferiorConRol() {
  const usuario = await obtenerUsuarioActual();
  return <BarraInferiorActiva rol={usuario?.rol ?? null} />;
}

/** Lee la sesión (cookies), así que va dentro de <Suspense>: el resto del marco no espera por ella. */
async function UsuarioDeLaSesion() {
  const usuario = await obtenerUsuarioActual();
  return <AccesoUsuario nombre={usuario?.nombre ?? null} />;
}
