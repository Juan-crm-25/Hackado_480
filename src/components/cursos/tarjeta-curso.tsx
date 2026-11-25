import { Layers, Star, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CursoResumen } from "@/lib/catalogo-bd";
import { formatoDecimal, formatoPrecio } from "@/lib/formato";
import { franjaDeCategoria, textoEstudiantes, textoModulos, textoValoraciones } from "./textos";

/** Resumen de las valoraciones (de ejemplo) que acompaña a cada curso. */
export interface ValoracionCurso {
  media: number | null;
  total: number;
}

export type CursoConValoracion = CursoResumen & { valoracion: ValoracionCurso };

/** Tarjeta de un curso en la home: categoría, título, descripción, precio, estudiantes y valoración media. */
export function TarjetaCurso({ curso }: { curso: CursoConValoracion }) {
  const { media, total } = curso.valoracion;
  return (
    <Card className="h-full flex-1 pt-0">
      <div aria-hidden className={`h-1.5 ${franjaDeCategoria(curso.categoria.slug)}`} />
      <CardHeader className="flex flex-1 flex-col gap-2">
        <div>
          <Badge variant="secondary">{curso.categoria.nombre}</Badge>
        </div>
        <CardTitle>
          <h3>
            <Link
              href={`/cursos/${curso.slug}`}
              className="inline-flex min-h-11 items-center rounded-sm text-lg leading-tight font-bold hover:underline hover:underline-offset-4"
            >
              {curso.titulo}
            </Link>
          </h3>
        </CardTitle>
        <CardDescription className="line-clamp-3">{curso.descripcion}</CardDescription>
        <ul className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            {textoEstudiantes(curso.numAlumnos)}
          </li>
          <li className="inline-flex items-center gap-1">
            <Layers className="size-4" aria-hidden />
            {textoModulos(curso.numModulos)}
          </li>
          {media !== null && (
            <li className="inline-flex items-center gap-1">
              <Star className="size-4 fill-current text-brand-coral" aria-hidden />
              <span>
                <span className="sr-only">Valoración media </span>
                <span className="font-semibold text-foreground">{formatoDecimal(media)}</span> · {textoValoraciones(total)}
              </span>
            </li>
          )}
        </ul>
        <p className="text-base font-bold text-foreground">{formatoPrecio(curso.precioCentimos)}</p>
      </CardHeader>
    </Card>
  );
}
