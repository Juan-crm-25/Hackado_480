"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ForoTemas } from "./foro-temas";
import { HiloTema } from "./hilo-tema";

/** Sube hasta el principio del foro si ha quedado por encima de la pantalla (suave solo si no se pide movimiento reducido). */
function subirAlForo(seccion: HTMLElement | null) {
  if (!seccion || seccion.getBoundingClientRect().top >= 0) return;
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  seccion.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
}

/**
 * Foro del módulo, al pie de su pantalla (`id="foro"`, al que baja «Ir al foro»). Es una sección aparte de los
 * vídeos: fondo suave (`bg-muted`) a todo el ancho con una línea de degradado de marca arriba (docs/estilo.md).
 * Muestra la lista de dudas o, si se abre una, su hilo en el mismo sitio; la lista sigue montada (oculta)
 * para que al volver no se recargue ni salte.
 */
export function SeccionForo({ cursoSlug, moduloSlug }: { cursoSlug: string; moduloSlug: string }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const seccion = useRef<HTMLElement>(null);
  const primera = useRef(true);

  // Al ocultarse la página (<Activity> de Next 16) se vuelve a la lista.
  useLayoutEffect(() => () => setAbierto(null), []);

  // Al abrir un hilo o volver a la lista, el foro empieza arriba.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    subirAlForo(seccion.current);
  }, [abierto]);

  return (
    <section
      ref={seccion}
      id="foro"
      tabIndex={-1}
      aria-labelledby="titulo-foro"
      className="relative -mx-4 -mb-6 flex min-h-96 scroll-mt-4 flex-col gap-4 bg-muted px-4 pt-8 pb-10 outline-none"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand via-brand-cyan to-brand-coral" />
      <h2 id="titulo-foro" className="text-2xl leading-tight font-bold">
        Foro del módulo
      </h2>
      <div hidden={abierto !== null}>
        <ForoTemas cursoSlug={cursoSlug} moduloSlug={moduloSlug} onAbrir={setAbierto} visible={abierto === null} />
      </div>
      {abierto && <HiloTema key={abierto} temaId={abierto} onVolver={() => setAbierto(null)} />}
    </section>
  );
}
