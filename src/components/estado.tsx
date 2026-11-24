/**
 * Estados de pantalla compartidos (docs/estilo.md, "Patrones de pantalla"):
 * - EstadoCargando: algo está en marcha (se anuncia como estado).
 * - EstadoVacio: aún no hay nada que mostrar; puede llevar acciones.
 * - EstadoError: algo ha fallado (se anuncia como alerta).
 */
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EstadoCargando({ texto = "Cargando…", className }: { texto?: string; className?: string }) {
  return (
    <p role="status" className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden />
      {texto}
    </p>
  );
}

export function EstadoVacio({
  children,
  acciones,
  className,
}: {
  children: ReactNode;
  acciones?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg bg-muted p-4 text-sm text-muted-foreground", className)}>
      <p>{children}</p>
      {acciones}
    </div>
  );
}

export function EstadoError({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
