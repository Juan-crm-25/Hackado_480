import { cn } from "@/lib/utils";

/** Bloque de carga (shadcn). Solo late si el sistema no pide movimiento reducido. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} {...props} />;
}

export { Skeleton };
