"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { TemaResumen } from "@/server/foro/servicio";
import { FormularioDuda } from "./formulario-duda";
import { ListaTemas } from "./lista-temas";

type Estado = { tipo: "cargando" } | { tipo: "listo"; temas: TemaResumen[] } | { tipo: "error"; mensaje: string };

/** Lista de dudas del módulo y «Nueva duda». Lee y escribe en /api/cursos/:slug/modulos/:modulo/temas. */
export function ForoTemas({ cursoSlug, moduloSlug, onAbrir }: { cursoSlug: string; moduloSlug: string; onAbrir: (id: string) => void }) {
  const url = `/api/cursos/${encodeURIComponent(cursoSlug)}/modulos/${encodeURIComponent(moduloSlug)}/temas`;
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado({ tipo: "cargando" });
    try {
      setEstado({ tipo: "listo", temas: await leerRespuesta<TemaResumen[]>(await fetch(url)) });
    } catch (e) {
      setEstado({ tipo: "error", mensaje: mensajeDeError(e) });
    }
  }, [url]);

  useEffect(() => {
    // Pide las dudas al mostrar el foro; el estado inicial ya es «cargando».
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  // Next 16 oculta la página con <Activity> al salir: se reinicia el envío (patrón de auth/campos.tsx).
  useLayoutEffect(
    () => () => {
      setEnviando(false);
      setError(null);
    },
    [],
  );

  async function publicar(datos: { titulo: string; cuerpo: string }, formulario: HTMLFormElement) {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(datos) });
      const tema = await leerRespuesta<TemaResumen>(res);
      formulario.reset();
      setEstado((e) => (e.tipo === "listo" ? { tipo: "listo", temas: [tema, ...e.temas] } : { tipo: "listo", temas: [tema] }));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FormularioDuda enviando={enviando} error={error} onEnviar={publicar} />
      {estado.tipo === "cargando" && <EstadoCargando texto="Cargando las dudas…" />}
      {estado.tipo === "error" && (
        <div className="flex flex-col items-start gap-2">
          <EstadoError>{estado.mensaje}</EstadoError>
          <Button variant="outline" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      )}
      {estado.tipo === "listo" && <ListaTemas temas={estado.temas} onAbrir={onAbrir} />}
    </div>
  );
}
