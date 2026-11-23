"use client";

import Link from "next/link";
import { useState } from "react";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MaterialComun } from "@/lib/types";

type Pestana = "resumen" | "tarjetas";

export function VistaMaterial({
  material,
  videos,
  enlaceTutor,
}: {
  material: MaterialComun;
  videos: VideoResumen[];
  enlaceTutor: string;
}) {
  const [pestana, setPestana] = useState<Pestana>("resumen");

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="grid flex-1 grid-cols-2 rounded-lg bg-muted p-1" role="tablist">
          {(["resumen", "tarjetas"] as const).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={pestana === p}
              onClick={() => setPestana(p)}
              className={`rounded-md py-2 text-sm font-medium ${pestana === p ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              {p === "resumen" ? "Resumen" : `Tarjetas (${material.tarjetas.length})`}
            </button>
          ))}
        </div>
      </div>

      {!material.revisado && (
        <Badge variant="outline" className="self-start">
          Generado por IA · pendiente de revisión
        </Badge>
      )}

      {pestana === "resumen" ? <Resumen material={material} videos={videos} /> : <Tarjetas material={material} videos={videos} />}

      <p className="mt-auto pt-2 text-center text-sm text-muted-foreground">
        ¿Te queda alguna duda?{" "}
        <Link href={enlaceTutor} className="font-medium text-foreground underline underline-offset-4">
          Pregúntale al tutor
        </Link>
      </p>
    </div>
  );
}

function Resumen({ material, videos }: { material: MaterialComun; videos: VideoResumen[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {material.resumen.map((s) => (
        <li key={s.titulo} className="flex flex-col gap-2 rounded-xl border p-4">
          <h2 className="font-semibold">{s.titulo}</h2>
          <p className="text-sm leading-relaxed">
            <TextoConCodigo texto={s.texto} />
          </p>
          {s.fuente && (
            <div>
              <FuenteVideo fuente={s.fuente} videos={videos} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function Tarjetas({ material, videos }: { material: MaterialComun; videos: VideoResumen[] }) {
  const [indice, setIndice] = useState(0);
  const [girada, setGirada] = useState(false);
  const tarjeta = material.tarjetas[indice];
  const total = material.tarjetas.length;

  function ir(nuevo: number) {
    setIndice((nuevo + total) % total);
    setGirada(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-center text-xs text-muted-foreground">
        Tarjeta {indice + 1} de {total} · toca para girarla
      </p>

      <button
        onClick={() => setGirada((g) => !g)}
        aria-label={girada ? "Ver la pregunta" : "Ver la respuesta"}
        className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 text-center transition-colors ${
          girada ? "border-primary bg-primary/5" : "bg-card"
        }`}
      >
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{girada ? "Respuesta" : "Pregunta"}</span>
        <span className={`w-full break-words ${girada ? "text-base" : "text-lg font-semibold"}`}>
          <TextoConCodigo texto={girada ? tarjeta.respuesta : tarjeta.pregunta} />
        </span>
      </button>

      {girada && tarjeta.fuente && (
        <div className="text-center">
          <FuenteVideo fuente={tarjeta.fuente} videos={videos} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => ir(indice - 1)}>
          ← Anterior
        </Button>
        <Button className="h-11" onClick={() => ir(indice + 1)}>
          Siguiente →
        </Button>
      </div>
    </div>
  );
}
