"use client";

import { useEffect, useId, useState } from "react";
import { EstadoError, EstadoVacio } from "@/components/estado";
import type { VideoResumen } from "@/components/fuente-video";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ALUMNO_DEMO_ID } from "@/lib/formato";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
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
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const idSobreQue = useId();

  useEffect(() => {
    fetch(`/api/material-personal?alumnoId=${ALUMNO_DEMO_ID}&moduloId=${encodeURIComponent(moduloId)}`)
      .then((r) => leerRespuesta<MaterialPersonal[]>(r))
      .then((datos) => {
        setLista(datos);
        setErrorLista(null);
      })
      .catch((e) => setErrorLista(`No se ha podido cargar tu material: ${mensajeDeError(e)}`));
  }, [moduloId]);

  if (!hayTranscripciones) {
    return (
      <EstadoVacio>Todavía no tengo el contenido de los vídeos de este módulo, así que aún no puedes crear material.</EstadoVacio>
    );
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
      setError(mensajeDeError(e));
    } finally {
      setCreando(false);
    }
  }

  const nombreConcepto = (id?: string) => conceptos.find((c) => c.id === id)?.nombre ?? "Todo el módulo";

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            crear();
          }}
        >
          <h2 className="text-xl leading-tight font-bold">Crea tu propio material</h2>

          <Opciones
            etiqueta="Qué quieres"
            valor={tipo}
            onCambio={(v) => setTipo(v as "resumen" | "tarjetas")}
            opciones={[
              { id: "tarjetas", texto: "Tarjetas" },
              { id: "resumen", texto: "Resumen" },
            ]}
          />

          <div className="flex flex-col gap-1 text-sm">
            <span id={idSobreQue} className="text-xs font-semibold text-muted-foreground">
              Sobre qué
            </span>
            {/* "Todo el módulo" es el valor null; en el estado sigue siendo "" como antes. */}
            <Select
              items={[{ value: null, label: "Todo el módulo" }, ...conceptos.map((c) => ({ value: c.id, label: c.nombre }))]}
              value={conceptoId || null}
              onValueChange={(v) => setConceptoId(v ?? "")}
            >
              <SelectTrigger aria-labelledby={idSobreQue} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Todo el módulo</SelectItem>
                {conceptos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Opciones etiqueta="Nivel" valor={nivel} onCambio={(v) => setNivel(v as NivelMaterial)} opciones={NIVELES} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold text-muted-foreground">¿Algo más? (opcional)</span>
            <Textarea
              value={enfoque}
              onChange={(e) => setEnfoque(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Por ejemplo: con más ejemplos, tipo examen…"
              className="resize-none"
            />
          </label>

          <Button type="submit" variant="accent" disabled={creando}>
            {creando ? "Creando tu material…" : "Crear"}
          </Button>
          {error && <EstadoError>{error}</EstadoError>}
          {restantes !== null && <p className="text-xs text-muted-foreground">Te quedan {restantes} consultas hoy</p>}
        </form>
      </Card>

      {errorLista && <EstadoError>{errorLista}</EstadoError>}

      {lista.length > 0 && (
        <ul className="flex flex-col gap-3">
          {lista.map((m) => (
            <li key={m.id}>
              <Card className="gap-3 p-4">
                <button
                  type="button"
                  aria-expanded={abierto === m.id}
                  className="flex min-h-11 flex-col items-start gap-1 rounded-sm text-left"
                  onClick={() => setAbierto(abierto === m.id ? null : m.id)}
                >
                  <span className="font-bold">
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
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Elegir una opción entre varias: ToggleGroup de shadcn con una sola opción pulsada siempre. */
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
      <legend className="pb-1 text-xs font-semibold text-muted-foreground">{etiqueta}</legend>
      <ToggleGroup
        value={[valor]}
        // Al pulsar la opción ya elegida, Base UI la desmarca (valor vacío): se ignora para que siempre haya una.
        onValueChange={(v) => v[0] && onCambio(v[0])}
        spacing={1}
        className="grid w-full auto-cols-fr grid-flow-col rounded-lg bg-muted p-1"
      >
        {opciones.map((o) => (
          <ToggleGroupItem
            key={o.id}
            value={o.id}
            className="text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {o.texto}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}
