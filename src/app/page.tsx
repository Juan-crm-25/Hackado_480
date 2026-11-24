import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurso, getModulos } from "@/lib/catalogo";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm underline underline-offset-4";

/**
 * Pantalla provisional: comprueba que el catálogo y los componentes funcionan.
 * La Home real (ruta sugerida, estado de cada módulo, PWA) es el issue #14.
 */
export default function Home() {
  const curso = getCurso();
  const modulos = getModulos();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase">480 Academy</p>
        <h1 className="text-3xl leading-tight font-bold md:text-4xl">{curso.titulo}</h1>
        <p className="text-sm text-muted-foreground">{curso.descripcion}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {modulos.map((modulo) => (
          <li key={modulo.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>
                    <h2>{modulo.titulo}</h2>
                  </CardTitle>
                  <Badge variant="secondary">{modulo.videos.length} vídeos</Badge>
                </div>
                <CardDescription>{modulo.descripcion}</CardDescription>
                <div className="flex flex-wrap gap-x-4 pt-1 text-sm font-medium">
                  <Link href={`/modulos/${modulo.id}/material`} className={CLASE_ENLACE}>
                    Material de repaso
                  </Link>
                  <Link href={`/modulos/${modulo.id}/tutor`} className={CLASE_ENLACE}>
                    Preguntar al tutor →
                  </Link>
                </div>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
