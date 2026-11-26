import { Skeleton } from "@/components/ui/skeleton";

/** Texto de carga solo para lectores de pantalla: lo que se ve es el esqueleto. */
function Anuncio({ texto }: { texto: string }) {
  return (
    <p role="status" className="sr-only">
      {texto}
    </p>
  );
}

/** Esqueleto de la lista de dudas: misma forma que `ListaTemas`, para que no salte al cargar. */
export function EsqueletoTemas() {
  return (
    <div className="flex flex-col gap-3">
      <Anuncio texto="Cargando las dudas…" />
      <ul aria-hidden className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Esqueleto del hilo: la duda arriba y un par de comentarios. */
export function EsqueletoHilo() {
  return (
    <div className="flex flex-col gap-4">
      <Anuncio texto="Cargando el hilo…" />
      <div aria-hidden className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <Skeleton className="h-6 w-2/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <ul aria-hidden className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <li key={i} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    </div>
  );
}
