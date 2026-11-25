import { Suspense, type ReactNode } from "react";
import { EstadoCargando } from "@/components/estado";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";

/**
 * Páginas que piden sesión: «Tus cursos» (panel y módulos), el tutor y el perfil.
 * `src/proxy.ts` ya redirige si no hay cookie; aquí se valida la sesión de verdad (que exista y no
 * haya caducado) antes de mostrar nada. Lee cookies, así que va dentro de <Suspense> (Cache Components).
 */
export default function LayoutPrivado({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<EstadoCargando className="mx-auto w-full max-w-md px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8" />}>
      <ConSesion>{children}</ConSesion>
    </Suspense>
  );
}

async function ConSesion({ children }: { children: ReactNode }) {
  await requerirUsuarioActual();
  return children;
}
