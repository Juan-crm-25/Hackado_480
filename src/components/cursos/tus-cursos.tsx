import { ChevronRight, Route } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type CursoConProgreso = {
  slug: string;
  titulo: string;
  categoria: string;
  totalModulos: number;
  modulosCompletados: number;
  porcentaje: number;
  personalizada: boolean;
};

/**
 * «Tus cursos»: título de cada curso con una barra del porcentaje completado (escrito también en texto).
 * Si el alumno aún no ha personalizado la ruta de un curso, la tarjeta se lo propone.
 */
export function ListaTusCursos({ cursos }: { cursos: CursoConProgreso[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {cursos.map((c) => (
        <li key={c.slug} className="flex">
          <Card className="flex-1 gap-0 p-0">
            <Link
              href={`/cursos/${c.slug}`}
              className="flex flex-1 flex-col gap-3 rounded-lg p-5 outline-none transition-colors duration-150 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-xs font-semibold text-muted-foreground">{c.categoria}</p>
                  <h3 className="text-lg leading-tight font-bold">{c.titulo}</h3>
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
              </div>
              <Progress value={c.porcentaje} aria-label={`Progreso en ${c.titulo}`} />
              <p className="flex justify-between gap-2 text-sm">
                <span className="font-semibold tabular-nums">{c.porcentaje} % completado</span>
                <span className="text-muted-foreground tabular-nums">
                  {c.modulosCompletados} de {c.totalModulos} módulos
                </span>
              </p>
            </Link>
            {!c.personalizada && (
              <Link
                href={`/cursos/${c.slug}/ruta`}
                className="flex min-h-11 items-center gap-2 border-t px-5 py-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
              >
                <Route className="size-4" aria-hidden />
                Personaliza tu ruta
              </Link>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
