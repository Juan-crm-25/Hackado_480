"use client";

import { useEffect, useState } from "react";

const MS_POR_LETRA = 45;

/**
 * Escribe el texto letra a letra, como una máquina de escribir, y deja al final una línea «|» verde.
 * - El resto de la frase ya ocupa su sitio (invisible): la página no salta mientras se escribe.
 * - Los lectores de pantalla leen la frase entera desde el principio (sr-only); la parte animada está oculta.
 * - Con «reducir movimiento» la frase aparece entera de golpe y la línea no parpadea.
 */
export function TextoMaquina({ texto }: { texto: string }) {
  const [letras, setLetras] = useState(0);

  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paso = reducir ? texto.length : 1;
    const intervalo = window.setInterval(() => {
      setLetras((n) => {
        const siguiente = Math.min(n + paso, texto.length);
        if (siguiente === texto.length) window.clearInterval(intervalo);
        return siguiente;
      });
    }, reducir ? 0 : MS_POR_LETRA);
    return () => window.clearInterval(intervalo);
  }, [texto]);

  return (
    <>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {texto.slice(0, letras)}
        <span className="ml-0.5 font-normal text-brand motion-safe:animate-pulse">|</span>
        <span className="invisible">{texto.slice(letras)}</span>
      </span>
    </>
  );
}
