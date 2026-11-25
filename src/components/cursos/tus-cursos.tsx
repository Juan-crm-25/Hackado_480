import { ChevronRight } from "lucide-react";
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
};

/** «Tus cursos»: título de cada curso con una barra del porcentaje completado (escrito también en texto). */
export function ListaTusCursos({ cursos }: { cursos: CursoConProgreso[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {cursos.map((c) => (
        <li key={c.slug} className="flex">
          <Card className="flex-1 p-0 transition-colors duration-150 hover:bg-muted/50">
            <Link
              href={`/cursos/${c.slug}`}
              className="flex h-full flex-col gap-3 rounded-xl p-5 outline-none focus-visible:ring-3 focus-visible:ring-ring"
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
          </Card>
        </li>
      ))}
    </ul>
  );
}
