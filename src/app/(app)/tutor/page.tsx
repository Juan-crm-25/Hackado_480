import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getModulos } from "@/lib/catalogo";

/** Tutor (IA): el tutor responde por módulo, así que primero se elige el módulo. */
export default function TutorInicio() {
  const modulos = getModulos();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-2xl">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl leading-tight font-bold">Tutor (IA)</h1>
        <p className="text-base text-muted-foreground">
          Elige un módulo. El tutor solo responde con lo que se explica en sus vídeos y te dice en qué minuto está.
        </p>
      </header>

      <ul className="flex flex-col divide-y rounded-lg border">
        {modulos.map((modulo) => (
          <li key={modulo.id}>
            <Link
              href={`/modulos/${modulo.id}/tutor`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-sm px-4 py-3 transition-colors duration-150 ease-in-out outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-bold">{modulo.titulo}</span>
                <span className="truncate text-sm text-muted-foreground">{modulo.descripcion}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
