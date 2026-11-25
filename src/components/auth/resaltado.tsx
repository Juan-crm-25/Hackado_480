import type { ReactNode } from "react";

/**
 * Subrayado de rotulador en verde claro (pantallas de acceso). Si el texto ocupa dos líneas, se
 * subrayan las dos. También ayuda a leerlo en web, donde el astronauta va por detrás.
 */
export function Resaltado({ children }: { children: ReactNode }) {
  return (
    <span className="box-decoration-clone bg-linear-to-t from-brand/40 from-45% to-transparent to-45% px-0.5">
      {children}
    </span>
  );
}
