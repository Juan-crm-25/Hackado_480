"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { TemaResumen } from "@/server/foro/servicio";
import { EsqueletoTemas } from "./esqueletos";
import { FormularioDuda } from "./formulario-duda";
import { ListaTemas } from "./lista-temas";

type Estado = { tipo: "cargando" } | { tipo: "listo"; temas: TemaResumen[] } | { tipo: "error"; mensaje: string };

/**
 * Lista de dudas del módulo y «Nueva duda» (plegada). Lee y escribe en /api/cursos/:slug/modulos/:modulo/temas.
 * Sigue montada mientras se ve un hilo (`visible` falso); al volver se actualiza sin pasar por «cargando».
 */
export function ForoTemas({
  cursoSlug,
  moduloSlug,
  onAbrir,
  visible = true,
}: {
  cursoSlug: string;
  moduloSlug: string;
  onAbrir: (id: string) => void;
  visible?: boolean;
}) {
  const url = `/api/cursos/${encodeURIComponent(cursoSlug)}/modulos/${encodeURIComponent(moduloSlug)}/temas`;
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [formAbierto, setFormAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const estabaVisible = useRef(visible);

  /** Pide las dudas. En silencio (al volver de un hilo) no muestra el esqueleto y un fallo deja la lista que ya había. */
  const cargar = useCallback(
    async (silencio = false) => {
      if (!silencio) setEstado({ tipo: "cargando" });
      try {
        setEstado({ tipo: "listo", temas: await leerRespuesta<TemaResumen[]>(await fetch(url)) });
      } catch (e) {
        if (!silencio) setEstado({ tipo: "error", mensaje: mensajeDeError(e) });
      }
    },
    [url],
  );

  useEffect(() => {
    // Pide las dudas al mostrar el foro; el estado inicial ya es «cargando».
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  useEffect(() => {
    // Al volver de un hilo, el número de comentarios puede haber cambiado.
    if (visible && !estabaVisible.current) void cargar(true);
    estabaVisible.current = visible;
  }, [visible, cargar]);

  // Next 16 oculta la página con <Activity> al salir: se reinicia el envío y se pliega el formulario (patrón de auth/campos.tsx).
  useLayoutEffect(
    () => () => {
      setEnviando(false);
      setError(null);
      setFormAbierto(false);
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
      setFormAbierto(false);
      setEstado((e) => (e.tipo === "listo" ? { tipo: "listo", temas: [tema, ...e.temas] } : { tipo: "listo", temas: [tema] }));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  function cancelar() {
    setError(null);
    setFormAbierto(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <FormularioDuda
        abierto={formAbierto}
        onAbrir={() => setFormAbierto(true)}
        onCancelar={cancelar}
        enviando={enviando}
        error={error}
        onEnviar={publicar}
      />
      {estado.tipo === "cargando" && <EsqueletoTemas />}
      {estado.tipo === "error" && (
        <div className="flex flex-col items-start gap-2">
          <EstadoError>{estado.mensaje}</EstadoError>
          <Button variant="outline" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      )}
      {estado.tipo === "listo" && (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <ListaTemas temas={estado.temas} onAbrir={onAbrir} />
        </div>
      )}
    </div>
  );
}
