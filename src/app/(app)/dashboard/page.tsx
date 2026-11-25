import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { estadoDeModulo, etiquetaEstado, moduloParaSeguir } from "@/lib/estado-modulos";
import { getProgresoDemo, getUsuarioDemo } from "@/lib/usuario-demo";
import { cargarCursoPrincipal } from "@/server/catalogo/servicio";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm underline underline-offset-4";

// Color de identidad de cada módulo según su orden: solo decorativo (docs/estilo.md, «Color con intención»).
const FRANJAS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

/**
 * Panel del alumno (/dashboard, «Tus cursos»): saludo, «Sigue donde lo dejaste» y los módulos del curso con su estado.
 * Sin id en la URL: el alumno sale de la sesión (de momento, el usuario de demostración).
 * El saludo va en el esqueleto estático; el curso sale de la BBDD en cada petición, dentro de <Suspense>
 * (Cache Components), así `next build` no necesita BBDD.
 */
export default function Dashboard() {
  const usuario = getUsuarioDemo();
  const nombre = usuario.nombre.split(" ")[0];

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <h1 className="text-3xl leading-tight font-bold md:text-4xl">Hola, {nombre}</h1>
      <Suspense fallback={<EstadoCargando texto="Cargando el curso…" />}>
        <ContenidoCurso alumnoId={usuario.id} />
      </Suspense>
    </main>
  );
}

async function ContenidoCurso({ alumnoId }: { alumnoId: string }) {
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
  const modulos = curso.modulos;
  // Progreso de demostración (el mismo que devuelve GET /api/progreso) hasta que haya login.
  const progreso = getProgresoDemo(alumnoId);
  const seguir = moduloParaSeguir(modulos, progreso);

  return (
    <>
      <div className="-mt-4 flex flex-col gap-2">
        <div>
          <Badge variant="secondary">{curso.categoria}</Badge>
        </div>
        <p className="text-base text-muted-foreground">
          Sigue aprendiendo con{" "}
<span className="font-medium text-foreground">{curso.titulo}</span>.
        </p>
        <p className="text-sm text-muted-foreground">{curso.descripcion}</p>
      </div>

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
        <h2 id="modulos" className="text-2xl leading-tight font-bold">
          Módulos del curso
        </h2>
        {modulos.length === 0 ? (
          <EstadoVacio>Este curso todavía no tiene módulos.</EstadoVacio>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {modulos.map((modulo, i) => (
              <li key={modulo.id} className="flex">
                <Card className="flex-1 pt-0">
                  <div aria-hidden className={`h-1.5 ${FRANJAS[i % FRANJAS.length]}`} />
                  <CardHeader className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {etiquetaEstado(estadoDeModulo(modulo.id, progreso))}
                    </p>
                    <CardTitle>
                      <h3>
                        <Link href={`/modulos/${modulo.id}`} className={`${CLASE_ENLACE} no-underline hover:underline`}>
                          {modulo.titulo}
                        </Link>
                      </h3>
                    </CardTitle>
                    <CardDescription>{modulo.descripcion}</CardDescription>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="secondary">
                        {modulo.clases.length} {modulo.clases.length === 1 ? "vídeo" : "vídeos"}
                      </Badge>
                      <Badge variant="outline">
                        {modulo.conceptos.length} {modulo.conceptos.length === 1 ? "concepto" : "conceptos"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 pt-1 text-sm font-medium">
                      <Link href={`/modulos/${modulo.id}`} className={CLASE_ENLACE}>
                        Ver vídeos
                      </Link>
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
        )}
      </section>
    </>
  );
}
