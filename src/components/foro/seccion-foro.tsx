"use client";

import { useLayoutEffect, useState } from "react";
import { ForoTemas } from "./foro-temas";
import { HiloTema } from "./hilo-tema";

/**
 * Foro del módulo, al pie de su pantalla (`id="foro"`, al que baja «Ir al foro»). Muestra la lista de dudas
 * o, si se abre una, su hilo en el mismo sitio.
 */
export function SeccionForo({ cursoSlug, moduloSlug }: { cursoSlug: string; moduloSlug: string }) {
  const [abierto, setAbierto] = useState<string | null>(null);

  // Al ocultarse la página (<Activity> de Next 16) se vuelve a la lista.
  useLayoutEffect(() => () => setAbierto(null), []);

  return (
    <section id="foro" tabIndex={-1} aria-labelledby="titulo-foro" className="flex scroll-mt-4 flex-col gap-4 outline-none">
      <h2 id="titulo-foro" className="text-lg leading-tight font-bold">
        Foro del módulo
      </h2>
      {abierto ? (
        <HiloTema temaId={abierto} onVolver={() => setAbierto(null)} />
      ) : (
        <ForoTemas cursoSlug={cursoSlug} moduloSlug={moduloSlug} onAbrir={setAbierto} />
      )}
    </section>
  );
}
