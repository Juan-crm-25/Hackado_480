import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurso, getModulos } from "@/lib/catalogo";

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
        <p className="text-sm text-muted-foreground">480 Academy</p>
        <h1 className="text-2xl font-semibold">{curso.titulo}</h1>
        <p className="text-sm text-muted-foreground">{curso.descripcion}</p>
      </header>

      <ul className="flex flex-col gap-3">
        {modulos.map((modulo) => (
          <li key={modulo.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{modulo.titulo}</CardTitle>
                  <Badge variant="secondary">{modulo.videos.length} vídeos</Badge>
                </div>
                <CardDescription>{modulo.descripcion}</CardDescription>
                <Link href={`/modulos/${modulo.id}/tutor`} className="pt-2 text-sm font-medium underline underline-offset-4">
                  Preguntar al tutor →
                </Link>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
