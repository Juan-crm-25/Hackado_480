import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto del formulario de login o registro mientras carga (fallback del Suspense).
 * Copia la estructura y las alturas del formulario real (login 428 px, registro 494 px): así el
 * cajón no crece al llegar el formulario y el astronauta no pega un salto al recargar.
 */
export function EsqueletoFormulario({ variante }: { variante: "login" | "registro" }) {
  const login = variante === "login";
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-col gap-4">
        {!login && <Campo />}
        <Campo />
        <Campo pista={!login} />
        {login && (
          <div data-esqueleto="olvidada" className="flex h-7 items-center justify-end">
            <Skeleton className="h-3.5 w-40" />
          </div>
        )}
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex h-5 items-center justify-center">
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} data-esqueleto="social" className="h-11" />
          ))}
        </div>
      </div>
      <div className="flex h-11 items-center justify-center">
        <Skeleton className="h-3.5 w-48" />
      </div>
    </div>
  );
}

/** Etiqueta (14 px) + campo (44 px); en registro, la pista de la contraseña (20 px). */
function Campo({ pista = false }: { pista?: boolean }) {
  return (
    <div data-esqueleto="campo" className="flex flex-col gap-2">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-11 w-full" />
      {pista && (
        <div data-esqueleto="pista" className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-32" />
        </div>
      )}
    </div>
  );
}
