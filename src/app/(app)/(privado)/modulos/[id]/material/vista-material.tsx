"use client";

import Link from "next/link";
import { useState } from "react";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { EstadoVacio } from "@/components/estado";
import { VistaInfografia } from "@/components/infografia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Concepto, Infografia, SeccionResumen, Tarjeta } from "@/lib/types";
import { MiMaterial } from "./mi-material";

type Pestana = "resumen" | "tarjetas" | "visual" | "mio";

export function VistaMaterial({
  moduloId,
  resumen,
  tarjetas,
  infografias,
  conceptos,
  videos,
  hayTranscripciones,
  enlaceTutor,
}: {
  moduloId: string;
  /** Resumen común YA REVISADO (el de los vídeos del módulo, en orden), o vacío si aún no hay. */
  resumen: SeccionResumen[];
  /** Tarjetas comunes YA REVISADAS, o vacío. */
  tarjetas: Tarjeta[];
  /** Infografías YA REVISADAS (#7), o vacío. */
  infografias: Infografia[];
  conceptos: Concepto[];
  videos: VideoResumen[];
  hayTranscripciones: boolean;
  enlaceTutor: string;
}) {
  const pestanas: { id: Pestana; texto: string }[] = [
    ...(resumen.length ? [{ id: "resumen" as const, texto: "Resumen" }] : []),
    ...(tarjetas.length ? [{ id: "tarjetas" as const, texto: "Tarjetas" }] : []),
    ...(infografias.length ? [{ id: "visual" as const, texto: "Visual" }] : []),
    { id: "mio", texto: "Mío" },
  ];
  const [pestana, setPestana] = useState<Pestana>(pestanas[0].id);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4">
      {/* Tabs de shadcn (Base UI): roles tab/tabpanel y flechas del teclado incluidos. */}
      <Tabs value={pestana} onValueChange={(v: Pestana) => setPestana(v)} className="gap-4">
        <TabsList className="grid w-full grid-flow-col auto-cols-fr">
          {pestanas.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.texto}
            </TabsTrigger>
          ))}
        </TabsList>

        {!resumen.length && !tarjetas.length && (
          <EstadoVacio>Este módulo todavía no tiene material de repaso del curso, pero puedes crearte el tuyo.</EstadoVacio>
        )}

        {resumen.length > 0 && (
          <TabsContent value="resumen">
            <Resumen secciones={resumen} videos={videos} />
          </TabsContent>
        )}
        {tarjetas.length > 0 && (
          <TabsContent value="tarjetas">
            <Tarjetas tarjetas={tarjetas} videos={videos} />
          </TabsContent>
        )}
        {infografias.length > 0 && (
          <TabsContent value="visual" className="flex flex-col gap-3">
            {infografias.map((info) => (
              <VistaInfografia key={info.conceptoId} infografia={info} videos={videos} />
            ))}
          </TabsContent>
        )}
        <TabsContent value="mio">
          <MiMaterial moduloId={moduloId} conceptos={conceptos} videos={videos} hayTranscripciones={hayTranscripciones} />
        </TabsContent>
      </Tabs>

      <p className="mt-auto pt-2 text-center text-sm text-muted-foreground">
        ¿Te queda alguna duda?{" "}
        <Link
          href={enlaceTutor}
          className="inline-flex min-h-11 items-center rounded-sm font-medium text-foreground underline underline-offset-4"
        >
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
        <li key={s.titulo}>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{s.titulo}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-base leading-relaxed">
                <TextoConCodigo texto={s.texto} />
              </p>
              {s.fuente && (
                <div>
                  <FuenteVideo fuente={s.fuente} videos={videos} />
                </div>
              )}
            </CardContent>
          </Card>
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
        className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border-2 p-6 text-center shadow-sm transition-colors duration-150 ease-in-out ${
          girada ? "border-primary bg-primary/5" : "bg-card"
        }`}
      >
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{girada ? "Respuesta" : "Pregunta"}</span>
        <span className={`w-full break-words ${girada ? "text-base" : "text-xl leading-tight font-bold"}`}>
          <TextoConCodigo texto={girada ? tarjeta.respuesta : tarjeta.pregunta} />
        </span>
      </button>

      {girada && tarjeta.fuente && (
        <div className="text-center">
          <FuenteVideo fuente={tarjeta.fuente} videos={videos} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => ir(indice - 1)}>
          ← Anterior
        </Button>
        <Button onClick={() => ir(indice + 1)}>
          Siguiente →
        </Button>
      </div>
    </div>
  );
}
