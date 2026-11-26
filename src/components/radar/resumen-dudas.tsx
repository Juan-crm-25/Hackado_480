"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { TextoConCodigo } from "@/components/fuente-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { RespuestaResumenDudas } from "@/lib/types";

type Estado = { tipo: "cargando" } | { tipo: "listo"; resumen: string } | { tipo: "error"; mensaje: string };

/**
 * Resumen de las dudas escrito por el agente analista (#5). Se pide aparte del Radar: los números ya se ven
 * mientras la IA trabaja, y si falla solo falla esta tarjeta.
 */
export function ResumenDudas({ curso }: { curso: string }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  const cargar = useCallback(async () => {
    setEstado({ tipo: "cargando" });
    try {
      const res = await fetch(`/api/radar/resumen?curso=${encodeURIComponent(curso)}`);
      const { resumen } = await leerRespuesta<RespuestaResumenDudas>(res);
      setEstado({ tipo: "listo", resumen });
    } catch (e) {
      setEstado({ tipo: "error", mensaje: mensajeDeError(e) });
    }
  }, [curso]);

  useEffect(() => {
    // Pide el resumen al abrir el Radar; el estado inicial ya es «cargando».
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  return <TarjetaResumen estado={estado} onReintentar={cargar} />;
}

export function TarjetaResumen({ estado, onReintentar }: { estado: Estado; onReintentar: () => void }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold">
          <Sparkles className="size-4 shrink-0" aria-hidden />
          Resumen de las dudas
        </h3>
        {estado.tipo === "listo" && <Badge variant="outline">Generado por IA</Badge>}
      </div>
      {estado.tipo === "cargando" && <EstadoCargando texto="Preparando el resumen de las dudas…" />}
      {estado.tipo === "listo" && (
        <p className="max-w-prose text-base leading-relaxed whitespace-pre-line">
          <TextoConCodigo texto={estado.resumen} />
        </p>
      )}
      {estado.tipo === "error" && (
        <div className="flex flex-col items-start gap-2">
          <EstadoError>{estado.mensaje}</EstadoError>
          <Button variant="outline" onClick={onReintentar}>
            Reintentar
          </Button>
        </div>
      )}
    </article>
  );
}
