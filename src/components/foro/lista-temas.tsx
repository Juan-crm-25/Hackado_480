import { ChevronRight, MessagesSquare } from "lucide-react";
import { EstadoVacio } from "@/components/estado";
import type { TemaResumen } from "@/server/foro/servicio";
import { AutorForoLinea } from "./autor-foro";
import { InsigniaPuntosProfesor } from "./insignias";

const textoComentarios = (n: number) => (n === 0 ? "Sin comentarios" : n === 1 ? "1 comentario" : `${n} comentarios`);

/** Dudas del módulo, en el orden que da la API (la más nueva primero). Cada una abre su hilo. */
export function ListaTemas({ temas, onAbrir }: { temas: TemaResumen[]; onAbrir: (id: string) => void }) {
  if (temas.length === 0) {
    return <EstadoVacio>Todavía no hay dudas en este módulo. ¡Pregunta la primera!</EstadoVacio>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {temas.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onAbrir(t.id)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border bg-card p-4 text-left shadow-sm transition-colors duration-150 ease-in-out outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-base leading-tight font-bold">{t.titulo}</span>
              <AutorForoLinea autor={t.autor} creado={t.creado} />
              <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MessagesSquare className="size-4" aria-hidden />
                  {textoComentarios(t.comentarios)}
                </span>
                <InsigniaPuntosProfesor puntos={t.puntosProfesor} />
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
