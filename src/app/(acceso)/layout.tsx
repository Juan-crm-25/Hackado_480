import { BookOpenCheck, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FiguraAcceso } from "@/components/auth/figura-acceso";
import { TextoMaquina } from "@/components/auth/texto-maquina";
import { Marca } from "@/components/marca";
import { Card } from "@/components/ui/card";

const VENTAJAS = [
  { icono: BookOpenCheck, texto: "Cursos en vídeo a tu ritmo, con una ruta sugerida" },
  { icono: MessageCircle, texto: "Un tutor con IA para resolver tus dudas en cada módulo" },
  { icono: Sparkles, texto: "Resúmenes y tarjetas de repaso de cada clase" },
];

/**
 * Pantallas de acceso (login y registro), fuera del marco de la app: sin barras de navegación.
 * Móvil y tableta: la marca arriba y el formulario. Web (lg): bloque oscuro de la marca a la izquierda
 * (docs/estilo.md, «bloque destacado») y el formulario a la derecha.
 */
export default function LayoutAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-background lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between gap-10 bg-surface-dark p-12 text-white lg:flex">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center self-center rounded-sm text-2xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Marca />
        </Link>
        {/* mb-32: sube el bloque por encima del centro (el panel reparte el espacio con justify-between). */}
        <div className="mb-32 flex max-w-md flex-col gap-6">
          {/* Se escribe como a máquina al entrar; al pasar de login a registro no se repite (el layout no cambia). */}
          <p className="text-4xl leading-tight font-bold">
            <TextoMaquina texto="Aprende a tu ritmo, con un tutor que te acompaña" />
          </p>
          <ul className="flex flex-col gap-4">
            {VENTAJAS.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-white/80">
                <Icono className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">480 Academy · Cuatroochenta</p>
      </aside>

      {/* overflow-x-clip: el astronauta puede sobresalir por la derecha sin crear scroll horizontal. */}
      <main className="flex w-full flex-1 flex-col items-center overflow-x-clip px-4 py-6 md:justify-center md:py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center self-center rounded-sm text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring lg:hidden"
          >
            <Marca />
          </Link>
          {/*
            El cajón y el astronauta están aquí, en el layout compartido: al pasar de login a registro
            solo cambia el contenido del cajón. isolate: el astronauta (-z-10) queda por detrás del
            contenido pero por encima del fondo.
          */}
          <div className="relative isolate flex flex-col gap-8">
            {/* Web (lg): al lado del título, grande y por detrás del contenido. */}
            <FiguraAcceso className="absolute -top-[39px] -right-[73px] -z-10 hidden w-80 lg:block xl:-top-[87px] xl:-right-[137px] xl:w-md" />
            {/*
              Móvil y tableta: título y formulario en un cajón con sombra hacia la derecha y abajo.
              En web (lg) el cajón se quita para que se vea el astronauta por detrás, desenfocado un poco
              para que el texto y los campos se lean bien.
            */}
            <Card className="gap-8 overflow-visible px-5 py-6 text-base shadow-[6px_8px_18px_-4px_color-mix(in_oklab,var(--foreground)_22%,transparent)] lg:border-0 lg:bg-transparent lg:px-0 lg:p-2 lg:shadow-none lg:backdrop-blur-[1.5px]">
              {children}
            </Card>
            {/* Móvil y tableta: debajo del cajón, centrado. */}
            <FiguraAcceso className="mx-auto w-56 md:w-64 lg:hidden" />
          </div>
        </div>
      </main>
    </div>
  );
}
