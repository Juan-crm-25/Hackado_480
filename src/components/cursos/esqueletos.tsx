import { Skeleton } from "@/components/ui/skeleton";

/*
 * Esqueletos de carga de los cursos: misma forma y rejilla que el contenido real (catalogo-cursos.tsx,
 * tus-cursos.tsx y la pantalla del curso del alumno), para que nada salte cuando llegan los datos.
 * Lo que se ve es decorativo (aria-hidden); a los lectores de pantalla se les anuncia la carga con texto.
 */

function Anuncio({ texto }: { texto: string }) {
  return (
    <p role="status" className="sr-only">
      {texto}
    </p>
  );
}

const TARJETA = "flex flex-1 flex-col overflow-hidden rounded-xl border bg-card";

/** Home: buscador, filtro de categoría y la rejilla de tarjetas de curso. */
export function EsqueletoCatalogo() {
  return (
    <div className="flex flex-col gap-4">
      <Anuncio texto="Cargando los cursos…" />
      <div aria-hidden className="flex flex-col gap-4">
        {/* Buscador y categoría, cada uno con su etiqueta (md:flex-1: en columna, flex-1 dejaría el buscador sin alto). */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex flex-col gap-2 md:flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="flex flex-col gap-2 md:w-48">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex">
              <div className={TARJETA}>
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** «Tus cursos»: banner, categoría, barra de progreso y el texto del porcentaje. */
export function EsqueletoTusCursos() {
  return (
    <div>
      <Anuncio texto="Cargando tus cursos…" />
      <ul aria-hidden className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <li key={i} className="flex">
            <div className={`${TARJETA} gap-3 p-5`}>
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Curso del alumno: cabecera, «Sigue donde lo dejaste» y las tarjetas de los módulos. */
export function EsqueletoCursoAlumno() {
  return (
    <div className="flex flex-col gap-6">
      <Anuncio texto="Cargando el curso…" />
      <div aria-hidden className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full max-w-prose" />
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-7 w-48" />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex">
              <div className={TARJETA}>
                <Skeleton className="h-1.5 w-full rounded-none" />
                <div className="flex flex-col gap-3 p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
