import { BookOpenCheck, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Marca } from "@/components/marca";

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
          className="inline-flex min-h-11 w-fit items-center rounded-sm text-2xl font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          <Marca />
        </Link>
        <div className="flex max-w-md flex-col gap-6">
          <p className="text-4xl leading-tight font-bold">Aprende a tu ritmo, con un tutor que te acompaña</p>
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

      <main className="flex w-full flex-1 flex-col items-center px-4 py-6 md:justify-center md:py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Link
            href="/"
            className="inline-flex min-h-11 w-fit items-center rounded-sm text-lg font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring lg:hidden"
          >
            <Marca />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
