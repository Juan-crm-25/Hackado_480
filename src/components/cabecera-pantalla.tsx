import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Cabecera de las pantallas de un módulo: enlace para volver al curso, sección y título. */
export function CabeceraPantalla({ seccion, titulo }: { seccion: string; titulo: string }) {
  return (
    <header className="flex items-center gap-1 border-b px-2 py-2">
      <Link
        href="/"
        aria-label="Volver al curso"
        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm px-2 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in-out hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Curso
      </Link>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{seccion}</p>
        <h1 className="truncate text-xl leading-tight font-bold">{titulo}</h1>
      </div>
    </header>
  );
}
