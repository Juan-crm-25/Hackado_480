"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { HiloForo } from "@/server/foro/servicio";
import { VistaHilo, type AccionesHilo, type DestinoPuntos } from "./vista-hilo";

type Estado = { tipo: "cargando" } | { tipo: "listo"; hilo: HiloForo } | { tipo: "error"; mensaje: string };

/** Sensei valora el comentario después de responder (con `after()`): se vuelve a pedir el hilo pasado este rato. */
const ESPERA_SENSEI_MS = 4000;

async function enviarJson(url: string, method: "POST" | "PUT" | "DELETE", cuerpo: unknown): Promise<void> {
  await leerRespuesta(await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) }));
}

/** Hilo de una duda: lo lee de /api/temas/:id y envía comentarios, valoraciones y puntos. */
export function HiloTema({ temaId, onVolver }: { temaId: string; onVolver: () => void }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [actualizando, setActualizando] = useState(false);
  /** Fallo al volver a pedir un hilo que ya se ve: se avisa sin quitarlo de la pantalla. */
  const [aviso, setAviso] = useState<string | null>(null);
  const hayHilo = useRef(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Pide el hilo. Si ya se ve, lo cambia sin pasar por «cargando». Nunca lanza: el fallo queda en el estado. */
  const cargar = useCallback(async () => {
    setActualizando(true);
    try {
      const hilo = await leerRespuesta<HiloForo>(await fetch(`/api/temas/${encodeURIComponent(temaId)}`));
      hayHilo.current = true;
      setEstado({ tipo: "listo", hilo });
      setAviso(null);
    } catch (e) {
      const mensaje = mensajeDeError(e);
      if (hayHilo.current) setAviso(mensaje);
      else setEstado({ tipo: "error", mensaje });
    } finally {
      setActualizando(false);
    }
  }, [temaId]);

  useEffect(() => {
    // Pide el hilo al abrirlo; el estado inicial ya es «cargando».
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
    return () => {
      if (espera.current) clearTimeout(espera.current);
    };
  }, [cargar]);

  const acciones: AccionesHilo = {
    async responder(cuerpo, respuestaAId) {
      await enviarJson(`/api/temas/${encodeURIComponent(temaId)}/comentarios`, "POST", { cuerpo, respuestaAId });
      await cargar();
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(() => void cargar(), ESPERA_SENSEI_MS);
    },
    async validar(comentarioId, validacion) {
      await enviarJson(`/api/comentarios/${encodeURIComponent(comentarioId)}/validacion`, "PUT", { validacion });
      await cargar();
    },
    async darPuntos(destino: DestinoPuntos, puntos, motivo) {
      await enviarJson("/api/foro/puntos", "PUT", { ...destino, puntos, motivo });
      await cargar();
    },
    async quitarPuntos(destino: DestinoPuntos) {
      await enviarJson("/api/foro/puntos", "DELETE", destino);
      await cargar();
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onVolver}>
          <ArrowLeft aria-hidden />
          Volver a las dudas
        </Button>
        {estado.tipo === "listo" && (
          <Button type="button" variant="outline" disabled={actualizando} onClick={() => void cargar()}>
            <RefreshCw aria-hidden className={actualizando ? "motion-safe:animate-spin" : undefined} />
            {actualizando ? "Actualizando…" : "Actualizar"}
          </Button>
        )}
      </div>
      {estado.tipo === "cargando" && <EstadoCargando texto="Cargando el hilo…" />}
      {estado.tipo === "error" && (
        <div className="flex flex-col items-start gap-2">
          <EstadoError>{estado.mensaje}</EstadoError>
          <Button variant="outline" onClick={() => void cargar()}>
            Reintentar
          </Button>
        </div>
      )}
      {estado.tipo === "listo" && aviso && <EstadoError>No se ha podido actualizar el hilo: {aviso}</EstadoError>}
      {estado.tipo === "listo" && <VistaHilo hilo={estado.hilo} acciones={acciones} />}
    </div>
  );
}
