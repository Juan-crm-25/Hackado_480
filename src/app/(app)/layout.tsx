import { Suspense } from "react";
import { BarraInferior } from "@/components/navegacion/barra-inferior";
import { BarraLateral } from "@/components/navegacion/barra-lateral";
import { BarraSuperior } from "@/components/navegacion/barra-superior";
import { BarraInferiorActiva, BarraLateralActiva } from "@/components/navegacion/navegacion-activa";
import { getUsuarioDemo } from "@/lib/usuario-demo";

/**
 * Marco de la app (docs/estilo.md, apartado 10, «Navegación de la app»).
 * Móvil y tableta: barra superior + contenido + barra inferior. Web (lg): barra lateral a la
 * izquierda + barra superior con el avatar + contenido. Las barras no se mueven: solo se desplaza
 * el contenido, así el chat del tutor puede ocupar el alto que queda entre ellas.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = getUsuarioDemo();

  return (
    <div className="flex h-dvh w-full">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-sm bg-background px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-3 focus:ring-ring"
      >
        Saltar al contenido
      </a>

      <Suspense fallback={<BarraLateral pathname={null} />}>
        <BarraLateralActiva />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior nombreUsuario={usuario.nombre} />
        <div id="contenido" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </div>
        <Suspense fallback={<BarraInferior pathname={null} />}>
          <BarraInferiorActiva />
        </Suspense>
      </div>
    </div>
  );
}
