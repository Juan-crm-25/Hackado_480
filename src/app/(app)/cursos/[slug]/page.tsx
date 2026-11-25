import { ArrowLeft, Layers, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { franjaDeCategoria, textoEstudiantes, textoModulos } from "@/components/cursos/textos";
import { ValoracionesCurso } from "@/components/cursos/valoraciones-curso";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { resumenValoraciones, valoracionesDe } from "@/lib/demo/valoraciones";
import { formatoPrecio } from "@/lib/formato";
import { obtenerUsuarioActual } from "@/server/auth/usuario-actual";
import { cargarCursoPublico } from "@/server/catalogo/servicio";
import { tieneElCurso } from "@/server/matriculas/servicio";

/**
 * Página pública de un curso: información, módulos, estudiantes, precio con la acción principal y valoraciones.
 * El curso se lee de la BBDD en cada petición, dentro de <Suspense> (Cache Components).
 */
export default function CursoPage({ params }: PageProps<"/cursos/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in-out hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Todos los cursos
        </Link>
      </div>
      <Suspense fallback={<EstadoCargando texto="Cargando el curso…" />}>
        <ContenidoCurso params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoCurso({ params }: { params: PageProps<"/cursos/[slug]">["params"] }) {
  await connection(); // el curso se lee en cada petición, nunca durante el build
  const { slug } = await params;
  const resultado = await cargarCursoPublico(slug);

  if (resultado.estado === "error") {
    return (
      <EstadoError>
        No se ha podido cargar el curso. <AyudaBd />
      </EstadoError>
    );
  }
  if (resultado.estado === "no-encontrado") notFound();

  const { curso } = resultado;
  const valoraciones = valoracionesDe(curso.slug);

  return (
    <>
      <header className="flex flex-col gap-3">
        <div aria-hidden className={`h-1.5 w-16 rounded-full ${franjaDeCategoria(curso.categoria.slug)}`} />
        <div>
          <Badge variant="secondary">{curso.categoria.nombre}</Badge>
        </div>
        <h1 className="text-3xl leading-tight font-bold md:text-4xl">{curso.titulo}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{curso.descripcion}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden />
            {textoEstudiantes(curso.numAlumnos)}
          </li>
          <li className="inline-flex items-center gap-1">
            <Layers className="size-4" aria-hidden />
            {textoModulos(curso.numModulos)}
          </li>
        </ul>
      </header>

      <section
        aria-labelledby="precio"
        className="flex flex-col gap-3 rounded-lg border p-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex flex-col gap-1">
          <h2 id="precio" className="text-xs font-semibold text-muted-foreground uppercase">
            Precio
          </h2>
          <p className="text-2xl font-bold">{formatoPrecio(curso.precioCentimos)}</p>
        </div>
        <AccionCurso slug={curso.slug} gratis={curso.precioCentimos === 0} />
      </section>

      <section aria-labelledby="modulos" className="flex flex-col gap-3">
        <h2 id="modulos" className="text-2xl leading-tight font-bold">
          Qué vas a aprender
        </h2>
        {curso.modulos.length === 0 ? (
          <EstadoVacio>Este curso todavía no tiene módulos.</EstadoVacio>
        ) : (
          <ol className="flex flex-col gap-3">
            {curso.modulos.map((m, i) => (
              <li key={m.id} className="flex gap-3 rounded-lg border p-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">
                    <span className="sr-only">Módulo {i + 1}: </span>
                    {m.titulo}
                  </h3>
                  <p className="max-w-prose text-sm text-muted-foreground">{m.descripcion}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <ValoracionesCurso resumen={resumenValoraciones(valoraciones)} valoraciones={valoraciones} />
    </>
  );
}

/**
 * Acción principal del curso: «Ir a tu curso» si ya lo tiene; si no, al pago simulado (que pide login).
 * Lee la sesión, pero ya está dentro del <Suspense> de la página.
 */
async function AccionCurso({ slug, gratis }: { slug: string; gratis: boolean }) {
  const usuario = await obtenerUsuarioActual();
  if (usuario && (await tieneElCurso(usuario.id, slug))) {
    return (
      <Link href="/dashboard" className={buttonVariants({ variant: "accent", size: "lg" })}>
        Ir a tu curso
      </Link>
    );
  }
  return (
    <Link href={`/pago/${slug}`} className={buttonVariants({ variant: "accent", size: "lg" })}>
      {gratis ? "Apuntarme gratis" : "Inscribirme"}
    </Link>
  );
}
