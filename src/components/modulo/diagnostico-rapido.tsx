"use client";

import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { DiagnosticoModulo, ResultadoDiagnostico } from "@/server/evaluaciones/servicio";
import { cn } from "@/lib/utils";

type Props = {
  moduloSlug: string;
  moduloTitulo: string;
};

export function DiagnosticoRapido({ moduloSlug, moduloTitulo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [cargandoPreguntas, setCargandoPreguntas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoModulo | null>(null);
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<ResultadoDiagnostico | null>(null);

  async function abrirDiagnostico() {
    if (abierto) {
      setAbierto(false);
      return;
    }

    setAbierto(true);
    setError(null);
    setResultado(null);

    if (diagnostico) return;

    setCargandoPreguntas(true);
    try {
      const res = await fetch(`/api/modulos/${encodeURIComponent(moduloSlug)}/diagnostico`);
      const datos = await leerRespuesta<DiagnosticoModulo>(res);
      setDiagnostico(datos);
    } catch (err) {
      setError(mensajeDeError(err, "No se ha podido cargar el diagnóstico rápido."));
    } finally {
      setCargandoPreguntas(false);
    }
  }

  function elegirOpcion(preguntaId: string, indice: number) {
    setSeleccion((prev) => ({ ...prev, [preguntaId]: indice }));
  }

  async function enviarRespuestas(e: React.FormEvent) {
    e.preventDefault();
    if (!diagnostico) return;

    const todasRespondidas = diagnostico.preguntas.every((p) => typeof seleccion[p.id] === "number");
    if (!todasRespondidas) {
      setError("Responde a todas las preguntas antes de comprobar tu nivel.");
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const res = await fetch(`/api/modulos/${encodeURIComponent(moduloSlug)}/diagnostico`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ respuestas: seleccion }),
      });
      const datos = await leerRespuesta<ResultadoDiagnostico>(res);
      setResultado(datos);
    } catch (err) {
      setError(mensajeDeError(err, "No se ha podido evaluar el diagnóstico."));
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setSeleccion({});
    setResultado(null);
    setError(null);
  }

  return (
    <section aria-labelledby="diagnostico-rapido" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="diagnostico-rapido" className="text-lg leading-tight font-bold">
          Diagnóstico rápido
        </h2>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 whitespace-normal"
          onClick={abrirDiagnostico}
          aria-expanded={abierto}
        >
          <ClipboardCheck aria-hidden />
          {abierto ? "Ocultar diagnóstico" : "Comprobar si ya lo domino (3 preguntas)"}
        </Button>
      </div>

      {abierto && (
        <Card className="flex flex-col gap-4 border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Responde a estas 3 preguntas de <strong className="font-semibold text-foreground">{moduloTitulo}</strong>. Si las
            aciertas todas, marcaremos el módulo como <strong>dominado</strong> y lo bajaremos en tu ruta sugerida (sin
            bloquear nada; para completarlo harás los ejercicios del módulo).
          </p>

          {error && <EstadoError>{error}</EstadoError>}

          {cargandoPreguntas ? (
            <EstadoCargando texto="Cargando preguntas del diagnóstico…" />
          ) : resultado ? (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted p-4">
              <div className="flex items-start gap-2">
                {resultado.dominado && <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-foreground" />}
                <div className="flex flex-col gap-1">
                  <p className="text-base font-bold text-foreground">
                    {resultado.dominado ? "Módulo marcado como dominado" : "Resultado del diagnóstico"}
                  </p>
                  <p className="text-sm text-foreground">{resultado.mensaje}</p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Aciertos: {resultado.aciertos} de {resultado.total}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={reiniciar}>
                  Repetir diagnóstico
                </Button>
              </div>
            </div>
          ) : (
            diagnostico && (
              <form onSubmit={enviarRespuestas} className="flex flex-col gap-5">
                {diagnostico.preguntas.map((pregunta, idx) => (
                  <fieldset key={pregunta.id} className="flex flex-col gap-2">
                    <legend className="text-sm font-bold text-foreground">
                      {idx + 1}. {pregunta.enunciado}
                    </legend>
                    <div className="flex flex-col gap-2">
                      {pregunta.opciones.map((opcion, opIdx) => {
                        const elegida = seleccion[pregunta.id] === opIdx;
                        return (
                          <button
                            key={`${pregunta.id}-${opIdx}`}
                            type="button"
                            aria-pressed={elegida}
                            onClick={() => elegirOpcion(pregunta.id, opIdx)}
                            className={cn(
                              "flex min-h-11 w-full items-center justify-between rounded-sm border px-3 py-2 text-left text-sm transition-colors duration-150",
                              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                              elegida
                                ? "border-primary bg-primary text-primary-foreground font-semibold"
                                : "border-input bg-background text-foreground hover:bg-muted",
                            )}
                          >
                            <span className="whitespace-normal">{opcion}</span>
                            {elegida && <span className="ml-2 text-xs font-semibold">Seleccionada</span>}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

                <Button type="submit" disabled={enviando} className="min-h-11 w-full">
                  {enviando ? "Comprobando respuestas…" : "Enviar diagnóstico"}
                </Button>
              </form>
            )
          )}
        </Card>
      )}
    </section>
  );
}