"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MOTIVOS_PUNTOS, PUNTOS_PROFESOR, type MotivoPuntos, type PuntosProfesor } from "@/lib/foro";
import type { PuntosProfesorForo } from "@/server/foro/servicio";
import { textoMotivo } from "./insignias";

/** Dar (o cambiar) +1, +3 o +6 por buena pregunta o buena conducta, o quitarlos. Solo para el profesor del curso. */
export function ControlesPuntos({
  actual,
  ocupado,
  onDar,
  onQuitar,
}: {
  actual: PuntosProfesorForo | null;
  ocupado: boolean;
  onDar: (puntos: PuntosProfesor, motivo: MotivoPuntos) => void;
  onQuitar: () => void;
}) {
  const [motivo, setMotivo] = useState<MotivoPuntos>(actual?.motivo ?? "buena_pregunta");

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-dashed p-3 text-sm">
      <legend className="px-1 text-xs font-semibold text-muted-foreground">Puntos del profesor</legend>
      <ToggleGroup
        value={[motivo]}
        // Al pulsar la opción ya elegida, Base UI la desmarca: se ignora para que siempre haya un motivo.
        onValueChange={(v) => v[0] && setMotivo(v[0] as MotivoPuntos)}
        spacing={1}
        aria-label="Motivo"
        className="grid w-full auto-cols-fr grid-flow-col rounded-lg bg-muted p-1"
      >
        {MOTIVOS_PUNTOS.map((m) => (
          <ToggleGroupItem
            key={m.id}
            value={m.id}
            className="text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {m.texto}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex flex-wrap items-center gap-2">
        {PUNTOS_PROFESOR.map((p) => {
          const elegido = actual?.puntos === p && actual.motivo === motivo;
          return (
            <Button
              key={p}
              type="button"
              variant={elegido ? "default" : "outline"}
              aria-pressed={elegido}
              aria-label={`Dar +${p} (${textoMotivo(motivo)})`}
              disabled={ocupado}
              onClick={() => onDar(p, motivo)}
              className="min-w-11"
            >
              +{p}
            </Button>
          );
        })}
        {actual && (
          <Button type="button" variant="ghost" disabled={ocupado} onClick={onQuitar}>
            <X aria-hidden />
            Quitar puntos
          </Button>
        )}
      </div>
    </fieldset>
  );
}

export type ValidacionElegible = "correcta" | "aproximada" | "incorrecta" | "no_respuesta";

const VALORACIONES: { value: ValidacionElegible; label: string }[] = [
  { value: "correcta", label: "Correcta (+10)" },
  { value: "aproximada", label: "Aproximada (+5)" },
  { value: "incorrecta", label: "Incorrecta" },
  { value: "no_respuesta", label: "No es respuesta" },
];

/** El profesor fija la valoración de un comentario de alumno; la suya manda sobre la de la IA. */
export function SelectorValidacion({
  valor,
  ocupado,
  onCambiar,
}: {
  valor: ValidacionElegible | "pendiente";
  ocupado: boolean;
  onCambiar: (v: ValidacionElegible) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span id={id} className="text-xs font-semibold text-muted-foreground">
        Valoración
      </span>
      <Select
        items={[{ value: null, label: "Sin valorar" }, ...VALORACIONES]}
        value={valor === "pendiente" ? null : valor}
        onValueChange={(v) => v && onCambiar(v as ValidacionElegible)}
        disabled={ocupado}
      >
        <SelectTrigger aria-labelledby={id} className="w-full md:w-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VALORACIONES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
