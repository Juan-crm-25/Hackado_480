import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { TarjetaModulo } from "@/components/cursos/tarjeta-modulo";
import { ListaTusCursos } from "@/components/cursos/tus-cursos";
import { Route } from "lucide-react";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { estadoDeModulo, etiquetaEstado, moduloParaSeguir } from "@/lib/estado-modulos";
import { aplicarOrden } from "@/lib/ruta";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { cargarCursoPrincipal } from "@/server/catalogo/servicio";
import { cargarAvanceDelCurso, cargarCursosDelUsuario, tieneElCurso } from "@/server/matriculas/servicio";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm underline underline-offset-4";


/**
 * Panel del alumno (/dashboard, «Tus cursos»): saludo, sus cursos con el porcentaje completado (de la BBDD),
 * y debajo «Sigue donde lo dejaste» y los módulos del curso principal con su estado.
 * Sin id en la URL: todo sale de la sesión. Los módulos van en el orden de la ruta personal del alumno
 * (src/lib/ruta.ts) y el progreso se lee de la BBDD.
 * El saludo y el curso se leen en cada petición, dentro de <Suspense> (Cache Components), así
 * `next build` no necesita BBDD.
 */
export default function Dashboard() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <Suspense fallback={<h1 className="text-3xl leading-tight font-bold md:text-4xl">Hola</h1>}>
        <Saludo />
      </Suspense>
      <section aria-labelledby="tus-cursos" className="flex flex-col gap-3">
        <h2 id="tus-cursos" className="text-2xl leading-tight font-bold">
          Tus cursos
        </h2>
        <Suspense fallback={<EstadoCargando texto="Cargando tus cursos…" />}>
          <CursosDelUsuario />
        </Suspense>
      </section>
      <Suspense fallback={<EstadoCargando texto="Cargando el curso…" />}>
        <ContenidoCurso />
      </Suspense>
    </main>
  );
}

async function Saludo() {
  const { nombre } = await requerirUsuarioActual();
  return <h1 className="text-3xl leading-tight font-bold md:text-4xl">Hola, {nombre.split(" ")[0]}</h1>;
}

async function CursosDelUsuario() {
  const usuario = await requerirUsuarioActual();
  const resultado = await cargarCursosDelUsuario(usuario.id);
  if (resultado.estado === "error") {
    return (
      <EstadoError>
        No se han podido cargar tus cursos. <AyudaBd />
      </EstadoError>
    );
  }
  if (resultado.estado === "vacio") {
    return (
      <EstadoVacio
        acciones={
          <Link href="/" className={buttonVariants({ variant: "accent" })}>
            Explorar cursos
          </Link>
        }
      >
        Todavía no tienes ningún curso. Elige uno y empieza hoy.
      </EstadoVacio>
    );
  }
  return <ListaTusCursos cursos={resultado.cursos} />;
}

async function ContenidoCurso() {
  await connection(); // el curso se lee en cada petición, nunca durante el build
  const resultado = await cargarCursoPrincipal();
  if (resultado.estado === "error") {
    return (
      <EstadoError>
        No se ha podido cargar el curso. <AyudaBd />
      </EstadoError>
    );
  }
  if (resultado.estado === "vacio") {
    return (
      <EstadoVacio>
        Todavía no hay ningún curso. <AyudaBd />
      </EstadoVacio>
    );
  }

  const { curso } = resultado;
  // El panel del curso principal solo para quien lo tiene; si no, «Tus cursos» ya invita a explorar.
  const usuario = await requerirUsuarioActual();
  if (!(await tieneElCurso(usuario.id, curso.id))) return null; // en CursoCatalogo, id es el slug
  const avance = await cargarAvanceDelCurso(usuario.id, curso.id);
  const modulos = aplicarOrden(curso.modulos, avance.orden);
  const progreso = avance.progreso;
  // Si ya ha terminado todos los módulos, «Sigue donde lo dejaste» propone el principal de su ruta para repasar.
  const seguir = moduloParaSeguir(modulos, progreso) ?? modulos.find((m) => m.id === avance.principal);

  return (
    <>
      <div className="flex flex-col gap-2">
        <div>
          <Badge variant="secondary">{curso.categoria}</Badge>
        </div>
        <p className="text-base text-muted-foreground">
          Sigue aprendiendo con{" "}
<span className="font-medium text-foreground">{curso.titulo}</span>.
        </p>
        <p className="text-sm text-muted-foreground">{curso.descripcion}</p>
      </div>

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

      {seguir && (
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
          <Link href={`/modulos/${seguir.id}/material`} className={buttonVariants({ variant: "accent", size: "lg" })}>
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
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
