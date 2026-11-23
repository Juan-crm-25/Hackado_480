"use client";

import { useEffect, useState } from "react";
import type { VideoResumen } from "@/components/fuente-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ALUMNO_DEMO_ID } from "@/lib/formato";
import type {
  Concepto,
  ErrorApi,
  MaterialPersonal,
  NivelMaterial,
  PeticionMaterialPersonal,
  RespuestaMaterialPersonal,
} from "@/lib/types";
import { Resumen, Tarjetas } from "./vista-material";

const NIVELES: { id: NivelMaterial; texto: string }[] = [
  { id: "basico", texto: "Más sencillo" },
  { id: "normal", texto: "Normal" },
  { id: "avanzado", texto: "Más avanzado" },
];

/** Pestaña "Mío": el alumno se crea su propio resumen o tarjetas, y ve los que ya ha creado (#2). */
export function MiMaterial({
  moduloId,
  conceptos,
  videos,
  hayTranscripciones,
}: {
  moduloId: string;
  conceptos: Concepto[];
  videos: VideoResumen[];
  hayTranscripciones: boolean;
}) {
  const [lista, setLista] = useState<MaterialPersonal[]>([]);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"resumen" | "tarjetas">("tarjetas");
  const [conceptoId, setConceptoId] = useState("");
  const [nivel, setNivel] = useState<NivelMaterial>("normal");
  const [enfoque, setEnfoque] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/material-personal?alumnoId=${ALUMNO_DEMO_ID}&moduloId=${encodeURIComponent(moduloId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((datos: MaterialPersonal[]) => setLista(datos))
      .catch(() => {});
  }, [moduloId]);

  if (!hayTranscripciones) {
    return <p className="text-sm text-muted-foreground">Todavía no tengo el contenido de los vídeos de este módulo, así que aún no puedes crear material.</p>;
  }

  async function crear() {
    setCreando(true);
    setError(null);
    try {
      const peticion: PeticionMaterialPersonal = {
        alumnoId: ALUMNO_DEMO_ID,
        moduloId,
        tipo,
        conceptoId: conceptoId || undefined,
        nivel,
        enfoque: enfoque.trim() || undefined,
      };
      const res = await fetch("/api/material-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peticion),
      });
      const datos = (await res.json()) as RespuestaMaterialPersonal | ErrorApi;
      if (!res.ok || "error" in datos) throw new Error("error" in datos ? datos.error : "Error inesperado");
      setLista((prev) => [datos.material, ...prev]);
      setAbierto(datos.material.id);
      setRestantes(datos.consultasRestantes);
      setEnfoque("");
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Sin conexión. Inténtalo de nuevo.");
    } finally {
      setCreando(false);
    }
  }

  const nombreConcepto = (id?: string) => conceptos.find((c) => c.id === id)?.nombre ?? "Todo el módulo";

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3 rounded-xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          crear();
        }}
      >
        <h2 className="font-semibold">Crea tu propio material</h2>

        <Opciones
          etiqueta="Qué quieres"
          valor={tipo}
          onCambio={(v) => setTipo(v as "resumen" | "tarjetas")}
          opciones={[
            { id: "tarjetas", texto: "Tarjetas" },
            { id: "resumen", texto: "Resumen" },
          ]}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Sobre qué</span>
          <select
            value={conceptoId}
            onChange={(e) => setConceptoId(e.target.value)}
            className="h-11 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todo el módulo</option>
            {conceptos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <Opciones etiqueta="Nivel" valor={nivel} onCambio={(v) => setNivel(v as NivelMaterial)} opciones={NIVELES} />

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">¿Algo más? (opcional)</span>
          <Textarea
            value={enfoque}
            onChange={(e) => setEnfoque(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Por ejemplo: con más ejemplos, tipo examen…"
            className="resize-none"
          />
        </label>

        <Button type="submit" className="h-11" disabled={creando}>
          {creando ? "Creando tu material…" : "Crear"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {restantes !== null && <p className="text-xs text-muted-foreground">Te quedan {restantes} consultas hoy</p>}
      </form>

      {lista.length > 0 && (
        <ul className="flex flex-col gap-3">
          {lista.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 rounded-xl border p-4">
              <button className="flex flex-col items-start gap-1 text-left" onClick={() => setAbierto(abierto === m.id ? null : m.id)}>
                <span className="font-medium">
                  {m.tipo === "tarjetas" ? `Tarjetas (${m.tarjetas?.length ?? 0})` : "Resumen"} · {nombreConcepto(m.conceptoId)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {NIVELES.find((n) => n.id === m.nivel)?.texto}
                  {m.enfoque ? ` · «${m.enfoque}»` : ""}
                </span>
                <Badge variant="outline">Generado por IA</Badge>
              </button>
              {abierto === m.id &&
                (m.tipo === "tarjetas" ? (
                  <Tarjetas tarjetas={m.tarjetas ?? []} videos={videos} />
                ) : (
                  <Resumen secciones={m.resumen ?? []} videos={videos} />
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Opciones({
  etiqueta,
  valor,
  onCambio,
  opciones,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  opciones: { id: string; texto: string }[];
}) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend className="pb-1 text-muted-foreground">{etiqueta}</legend>
      <div className="grid gap-1 rounded-lg bg-muted p-1" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={valor === o.id}
            onClick={() => onCambio(o.id)}
            className={`rounded-md py-2 text-sm ${valor === o.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
