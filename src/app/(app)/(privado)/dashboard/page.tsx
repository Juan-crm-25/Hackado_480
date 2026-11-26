import Link from "next/link";
import { Suspense } from "react";
import { AyudaBd } from "@/components/cursos/ayuda-bd";
import { EsqueletoTusCursos } from "@/components/cursos/esqueletos";
import { ListaTusCursos } from "@/components/cursos/tus-cursos";
import { EstadoError, EstadoVacio } from "@/components/estado";
import { buttonVariants } from "@/components/ui/button";
import { requerirUsuarioActual } from "@/server/auth/usuario-actual";
import { cargarCursosDelUsuario } from "@/server/matriculas/servicio";

/**
 * Panel del alumno (/dashboard, «Tus cursos»): saludo y sus cursos con el porcentaje completado (de la BBDD).
 * Cada curso entra a su pantalla (/dashboard/[slug]) con sus módulos y «Sigue donde lo dejaste».
 * Sin id en la URL: todo sale de la sesión. Se lee en cada petición, dentro de <Suspense> (Cache Components),
 * así `next build` no necesita BBDD.
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
        <Suspense fallback={<EsqueletoTusCursos />}>
          <CursosDelUsuario />
        </Suspense>
      </section>
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
