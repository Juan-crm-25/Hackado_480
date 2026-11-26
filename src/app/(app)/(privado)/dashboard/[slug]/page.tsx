import { ArrowLeft, Route } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { EsqueletoCursoAlumno } from "@/components/cursos/esqueletos";
import { TarjetaModulo } from "@/components/cursos/tarjeta-modulo";
import { EstadoError, EstadoVacio } from "@/components/estado";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { estadoDeModulo, etiquetaEstado, moduloParaSeguir } from "@/lib/estado-modulos";
import { aplicarOrden } from "@/lib/ruta";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { cargarCursoPorSlug } from "@/server/catalogo/servicio";
import { cargarAvanceDelCurso, tieneElCurso } from "@/server/matriculas/servicio";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm underline underline-offset-4";

/**
 * Curso del alumno (/dashboard/[slug]), al que se entra desde «Tus cursos»: «Sigue donde lo dejaste» y los
 * módulos en el orden de su ruta, con su progreso. La flecha vuelve a «Tus cursos». Quien no tiene el curso
 * ve un aviso con el enlace a su ficha. La sesión y el curso se leen dentro de <Suspense> (Cache Components).
 */
export default function CursoDelAlumno({ params }: PageProps<"/dashboard/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground transition-colors duration-150 ease-in-out hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Tus cursos
        </Link>
      </div>
      <Suspense fallback={<EsqueletoCursoAlumno />}>
        <ContenidoCurso params={params} />
      </Suspense>
    </main>
  );
}

async function ContenidoCurso({ params }: { params: PageProps<"/dashboard/[slug]">["params"] }) {
  await connection(); // el curso se lee en cada petición, nunca durante el build
  const { slug } = await params;
  const usuario = await requerirUsuarioActual();
  const resultado = await cargarCursoPorSlug(slug);
  if (resultado.estado === "error") {
    return (
      <EstadoError>
        No se ha podido cargar el curso. <AyudaBd />
      </EstadoError>
    );
  }
  if (resultado.estado === "no-encontrado") notFound();
  if (!(await tieneElCurso(usuario.id, slug))) {
    return (
      <EstadoVacio
        acciones={
          <Link href={`/cursos/${slug}`} className={buttonVariants({ variant: "accent" })}>
            Ver el curso
          </Link>
        }
      >
        Todavía no tienes este curso.
      </EstadoVacio>
    );
  }

  const { curso } = resultado;
  // Solo el curso de demo tiene pantallas de módulo (vídeos, material y tutor); el resto, «Contenido próximamente».
  const disponible = curso.id === CURSO_DEMO_SLUG;
  const avance = await cargarAvanceDelCurso(usuario.id, curso.id);
  const modulos = aplicarOrden(curso.modulos, avance.orden);
  const progreso = avance.progreso;
  // Si ya ha terminado todos los módulos, «Sigue donde lo dejaste» propone el principal de su ruta para repasar.
  const seguir = moduloParaSeguir(modulos, progreso) ?? modulos.find((m) => m.id === avance.principal);

  return (
    <>
      <header className="flex flex-col gap-2">
        <div>
          <Badge variant="secondary">{curso.categoria}</Badge>
        </div>
        <h1 className="text-3xl leading-tight font-bold md:text-4xl">{curso.titulo}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{curso.descripcion}</p>
      </header>

      {!avance.orden && (
        <section
          aria-labelledby="personaliza"
          className="flex flex-col gap-3 rounded-lg border p-5 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="personaliza" className="flex items-center gap-2 text-lg font-bold">
              <Route className="size-5" aria-hidden />
              Personaliza tu ruta
            </h2>
            <p className="text-sm text-muted-foreground">
              Dinos cuánto te interesa cada módulo y tu tutor te recomendará por dónde empezar. Te lleva un minuto.
            </p>
          </div>
          <Link href={`/cursos/${curso.id}/ruta`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            Personalizar
          </Link>
        </section>
      )}

      {seguir && disponible && (
        <section
          aria-labelledby="sigue"
          className="flex flex-col gap-4 rounded-lg bg-surface-dark p-5 text-white md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="sigue" className="text-xs font-semibold text-white/80 uppercase">
              Sigue donde lo dejaste
            </h2>
            <p className="text-xl font-bold">{seguir.titulo}</p>
            <p className="text-sm text-white/80">{etiquetaEstado(estadoDeModulo(seguir.id, progreso))}</p>
          </div>
          <Link href={`/modulos/${seguir.id}`} className={buttonVariants({ variant: "accent", size: "lg" })}>
            Continuar
          </Link>
        </section>
      )}

      <section aria-labelledby="modulos" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="modulos" className="text-2xl leading-tight font-bold">
            {avance.orden ? "Tu ruta" : "Módulos del curso"}
          </h2>
          {avance.orden && (
            <Link href={`/cursos/${curso.id}/ruta`} className={`${CLASE_ENLACE} text-sm font-medium`}>
              Cambiar mi ruta
            </Link>
          )}
        </div>
        {modulos.length === 0 ? (
          <EstadoVacio>Este curso todavía no tiene módulos.</EstadoVacio>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo, i) => (
              <li key={modulo.id} className="flex">
                <TarjetaModulo
                  modulo={{
                    id: modulo.id,
                    titulo: modulo.titulo,
                    descripcion: modulo.descripcion,
                    numClases: modulo.clases.length,
                    numConceptos: modulo.conceptos.length,
                  }}
                  estado={estadoDeModulo(modulo.id, progreso)}
                  indice={i}
                  recomendado={modulo.id === avance.principal}
                  disponible={disponible}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
