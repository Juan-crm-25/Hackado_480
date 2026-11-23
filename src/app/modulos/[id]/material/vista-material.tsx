"use client";

import Link from "next/link";
import { useState } from "react";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { VistaInfografia } from "@/components/infografia";
import { Button } from "@/components/ui/button";
import type { Concepto, Infografia, MaterialComun, SeccionResumen, Tarjeta } from "@/lib/types";
import { MiMaterial } from "./mi-material";

type Pestana = "resumen" | "tarjetas" | "visual" | "mio";

export function VistaMaterial({
  moduloId,
  material,
  infografias,
  conceptos,
  videos,
  hayTranscripciones,
  enlaceTutor,
}: {
  moduloId: string;
  /** Material común YA REVISADO, o null si aún no hay. */
  material: MaterialComun | null;
  /** Infografías YA REVISADAS (#7), o vacío. */
  infografias: Infografia[];
  conceptos: Concepto[];
  videos: VideoResumen[];
  hayTranscripciones: boolean;
  enlaceTutor: string;
}) {
  const pestanas: { id: Pestana; texto: string }[] = [
    ...(material
      ? [
          { id: "resumen" as const, texto: "Resumen" },
          { id: "tarjetas" as const, texto: "Tarjetas" },
        ]
      : []),
    ...(infografias.length ? [{ id: "visual" as const, texto: "Visual" }] : []),
    { id: "mio", texto: "Mío" },
  ];
  const [pestana, setPestana] = useState<Pestana>(pestanas[0].id);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4">
      <div className="grid rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${pestanas.length}, minmax(0, 1fr))` }} role="tablist">
        {pestanas.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`rounded-md py-2 text-sm font-medium ${pestana === p.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {p.texto}
          </button>
        ))}
      </div>

      {!material && (
        <p className="text-sm text-muted-foreground">Este módulo todavía no tiene material de repaso del curso, pero puedes crearte el tuyo.</p>
      )}

      {pestana === "resumen" && material && <Resumen secciones={material.resumen} videos={videos} />}
      {pestana === "tarjetas" && material && <Tarjetas tarjetas={material.tarjetas} videos={videos} />}
      {pestana === "visual" && (
        <div className="flex flex-col gap-3">
          {infografias.map((info) => (
            <VistaInfografia key={info.conceptoId} infografia={info} videos={videos} />
          ))}
        </div>
      )}
      {pestana === "mio" && (
        <MiMaterial moduloId={moduloId} conceptos={conceptos} videos={videos} hayTranscripciones={hayTranscripciones} />
      )}

      <p className="mt-auto pt-2 text-center text-sm text-muted-foreground">
        ¿Te queda alguna duda?{" "}
        <Link href={enlaceTutor} className="font-medium text-foreground underline underline-offset-4">
          Pregúntale al tutor
        </Link>
      </p>
    </div>
  );
}

export function Resumen({ secciones, videos }: { secciones: SeccionResumen[]; videos: VideoResumen[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {secciones.map((s) => (
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

export function Tarjetas({ tarjetas, videos }: { tarjetas: Tarjeta[]; videos: VideoResumen[] }) {
  const [indice, setIndice] = useState(0);
  const [girada, setGirada] = useState(false);
  const total = tarjetas.length;
  const tarjeta = tarjetas[Math.min(indice, total - 1)];
  if (!tarjeta) return null;

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
