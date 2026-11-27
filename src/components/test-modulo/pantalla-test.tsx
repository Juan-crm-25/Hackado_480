"use client";

import { CircleCheck, CircleDot, CircleX, RotateCcw, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { EstadoError, EstadoVacio } from "@/components/estado";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { EjercicioPublico, ResultadoPregunta, ResultadoTestModulo, TestModulo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type Respuestas, cuantasRespondidas, mensajeResultado, peticionEntrega, textoDeRespuesta, textoNota } from "./logica";

type Fase =
  | { tipo: "inicio"; error?: string }
  | { tipo: "respondiendo"; test: TestModulo; error?: string }
  | { tipo: "corrigiendo"; test: TestModulo }
  | { tipo: "resultado"; test: TestModulo; resultado: ResultadoTestModulo };

/**
 * Pantalla del test del módulo (#3): presentación → preguntas → corrección con la nota y, en cada fallo, el vídeo y el
 * minuto que hay que repasar. Las preguntas y la corrección las da la API (`/api/modulos/:id/test`).
 */
export function PantallaTestModulo({ moduloId, videos }: { moduloId: string; videos: VideoResumen[] }) {
  const [fase, setFase] = useState<Fase>({ tipo: "inicio" });
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [cargando, setCargando] = useState(false);
  const url = `/api/modulos/${encodeURIComponent(moduloId)}/test`;

  // Al pasar a las preguntas o a la nota se vuelve arriba: en la app se desplaza el contenido, no la ventana.
  const arriba = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fase.tipo === "respondiendo" || fase.tipo === "resultado") arriba.current?.scrollIntoView({ block: "start" });
  }, [fase.tipo]);

  async function empezar() {
    setCargando(true);
    try {
      const test = await leerRespuesta<TestModulo>(await fetch(url));
      setRespuestas({});
      setFase({ tipo: "respondiendo", test });
    } catch (e) {
      setFase({ tipo: "inicio", error: mensajeDeError(e) });
    } finally {
      setCargando(false);
    }
  }

  async function entregar(test: TestModulo) {
    setFase({ tipo: "corrigiendo", test });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peticionEntrega(test, respuestas)),
      });
      setFase({ tipo: "resultado", test, resultado: await leerRespuesta<ResultadoTestModulo>(res) });
    } catch (e) {
      // Las respuestas se quedan: puede volver a entregar.
      setFase({ tipo: "respondiendo", test, error: mensajeDeError(e) });
    }
  }

  return (
    <div ref={arriba} className="scroll-mt-20">
      {fase.tipo === "inicio" ? (
        <div className="flex flex-col gap-4 px-4 py-6">
          <Presentacion />
          {fase.error && <EstadoError>{fase.error}</EstadoError>}
          <Button variant="accent" onClick={empezar} disabled={cargando} className="self-start">
            {cargando ? "Preparando tu test…" : fase.error ? "Volver a intentarlo" : "Empezar el test"}
          </Button>
        </div>
      ) : fase.tipo === "resultado" ? (
        <ResultadoDelTest
          test={fase.test}
          respuestas={respuestas}
          resultado={fase.resultado}
          videos={videos}
          acciones={
            <div className="flex flex-wrap gap-3">
              <Button variant="accent" onClick={empezar} disabled={cargando}>
                <RotateCcw aria-hidden />
                {cargando ? "Preparando tu test…" : "Repetir el test"}
              </Button>
              <Link href={`/modulos/${moduloId}`} className={buttonVariants({ variant: "outline" })}>
                Volver al módulo
              </Link>
            </div>
          }
        />
      ) : (
        <Preguntas
          test={fase.test}
          respuestas={respuestas}
          corrigiendo={fase.tipo === "corrigiendo"}
          error={fase.tipo === "respondiendo" ? fase.error : undefined}
          onCambiar={(id, r) => setRespuestas((antes) => ({ ...antes, [id]: r }))}
          onEntregar={() => void entregar(fase.test)}
        />
      )}
    </div>
  );
}

/** Las preguntas del test y el botón de entregar, que se activa cuando están todas respondidas. */
function Preguntas({
  test,
  respuestas,
  corrigiendo,
  error,
  onCambiar,
  onEntregar,
}: {
  test: TestModulo;
  respuestas: Respuestas;
  corrigiendo: boolean;
  error?: string;
  onCambiar: (ejercicioId: string, respuesta: string | number) => void;
  onEntregar: () => void;
}) {
  const hechas = cuantasRespondidas(test.preguntas, respuestas);
  const completas = hechas === test.preguntas.length;
  return (
    <form
      className="flex flex-col gap-4 px-4 py-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (completas && !corrigiendo) onEntregar();
      }}
    >
      <p className="text-sm text-muted-foreground">
        {test.preguntas.length} preguntas. Se aprueba con un {test.notaAprobado}.
      </p>
      <ol className="flex flex-col gap-4">
        {test.preguntas.map((p, i) => (
          <li key={p.id}>
            <PreguntaDelTest
              pregunta={p}
              numero={i + 1}
              total={test.preguntas.length}
              respuesta={respuestas[p.id]}
              desactivada={corrigiendo}
              onCambiar={(r) => onCambiar(p.id, r)}
            />
          </li>
        ))}
      </ol>
      {error && <EstadoError>{error}</EstadoError>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="accent" disabled={!completas || corrigiendo}>
          {corrigiendo ? "Corrigiendo tu test…" : "Entregar el test"}
        </Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {completas ? "Ya puedes entregarlo." : `Has respondido ${hechas} de ${test.preguntas.length}.`}
        </p>
      </div>
    </form>
  );
}

function Presentacion() {
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h2 className="text-lg leading-tight font-bold">Comprueba lo que has aprendido</h2>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        <li>Entre 5 y 8 preguntas de los vídeos del módulo, distintas cada vez.</li>
        <li>Se aprueba con un 7 y así completas el módulo. Puedes repetirlo: cuenta tu mejor nota.</li>
        <li>Si fallas una, te decimos qué momento del vídeo repasar.</li>
        <li>Las preguntas abiertas y de código las corrige la IA y cuentan como una consulta de tu límite diario.</li>
      </ul>
    </section>
  );
}

const TIPO: Record<EjercicioPublico["tipo"], string> = {
  test: "Elige una respuesta",
  respuesta_corta: "Respuesta corta",
  abierta: "Explícalo con tus palabras",
  codigo: "Escribe el código",
};

/** Una pregunta del test con su control: opciones (test), una línea (respuesta corta) o un cuadro de texto. */
export function PreguntaDelTest({
  pregunta,
  numero,
  total,
  respuesta,
  desactivada = false,
  onCambiar,
}: {
  pregunta: EjercicioPublico;
  numero: number;
  total: number;
  respuesta: string | number | undefined;
  desactivada?: boolean;
  onCambiar: (respuesta: string | number) => void;
}) {
  const id = useId();
  const cabecera = (
    <>
      <span className="block text-xs font-semibold text-muted-foreground">
        Pregunta {numero} de {total} · {TIPO[pregunta.tipo]}
      </span>
      <span className="mt-1 block text-base font-medium">
        <TextoConCodigo texto={pregunta.enunciado} />
      </span>
    </>
  );

  return (
    <div className="rounded-lg border bg-card p-4">
      {pregunta.tipo === "test" ? (
        <fieldset className="flex flex-col gap-2" disabled={desactivada}>
          <legend className="mb-3">{cabecera}</legend>
          {(pregunta.opciones ?? []).map((texto, i) => (
            <label
              key={i}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name={id}
                value={i}
                checked={respuesta === i}
                onChange={() => onCambiar(i)}
                className="size-4 shrink-0 accent-primary"
              />
              <TextoConCodigo texto={texto} />
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-3">
          <label htmlFor={id}>{cabecera}</label>
          {pregunta.tipo === "respuesta_corta" ? (
            <Input
              id={id}
              value={String(respuesta ?? "")}
              onChange={(e) => onCambiar(e.target.value)}
              disabled={desactivada}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={200}
              className="h-11"
            />
          ) : (
            <Textarea
              id={id}
              value={String(respuesta ?? "")}
              onChange={(e) => onCambiar(e.target.value)}
              disabled={desactivada}
              rows={pregunta.tipo === "codigo" ? 6 : 4}
              maxLength={4000}
              spellCheck={pregunta.tipo !== "codigo"}
              className={cn(pregunta.tipo === "codigo" && "font-mono text-sm")}
            />
          )}
        </div>
      )}
    </div>
  );
}

function estadoPregunta(r: ResultadoPregunta) {
  if (r.correcto) return { texto: "Correcta", Icono: CircleCheck };
  if (r.puntuacion > 0) return { texto: "Parcialmente correcta", Icono: CircleDot };
  return { texto: "Incorrecta", Icono: CircleX };
}

/** La nota del test y la corrección de cada pregunta, con el vídeo y el minuto que repasar en las que no son correctas. */
export function ResultadoDelTest({
  test,
  respuestas,
  resultado,
  videos,
  acciones,
}: {
  test: TestModulo;
  respuestas: Respuestas;
  resultado: ResultadoTestModulo;
  videos: VideoResumen[];
  acciones?: React.ReactNode;
}) {
  const Icono = resultado.aprobado ? CircleCheck : CircleX;
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <section aria-labelledby="nota" className="flex flex-col gap-2 rounded-lg bg-surface-dark p-4 text-white">
        <h2 id="nota" className="flex items-center gap-2 text-lg font-bold">
          <Icono className="size-5 shrink-0" aria-hidden />
          {resultado.aprobado ? "Aprobado" : "Suspendido"}
        </h2>
        <p className="text-4xl leading-none font-bold">
          {textoNota(resultado.nota)}
          <span className="text-lg font-semibold"> / 10</span>
        </p>
        <p className="text-sm">{mensajeResultado(resultado)}</p>
        {resultado.mejorNota > resultado.nota && <p className="text-sm">Tu mejor nota: {textoNota(resultado.mejorNota)}</p>}
      </section>
      {acciones}
      <h2 className="text-lg leading-tight font-bold">Corrección</h2>
      <ol className="flex flex-col gap-3">
        {resultado.resultados.map((r, i) => {
          const pregunta = test.preguntas.find((p) => p.id === r.ejercicioId);
          if (!pregunta) return null;
          const { texto, Icono: IconoPregunta } = estadoPregunta(r);
          return (
            <li key={r.ejercicioId} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <IconoPregunta className="size-4 shrink-0" aria-hidden />
                Pregunta {i + 1}: {texto}
              </p>
              <p className="text-base">
                <TextoConCodigo texto={pregunta.enunciado} />
              </p>
              <p className={cn("text-sm text-muted-foreground", pregunta.tipo === "codigo" && "font-mono whitespace-pre-wrap")}>
                Tu respuesta: {textoDeRespuesta(pregunta, respuestas[pregunta.id])}
              </p>
              <p className="text-sm">
                <TextoConCodigo texto={r.feedback} />
              </p>
              {r.repasar && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>Repasa:</span>
                  <FuenteVideo fuente={r.repasar} videos={videos} />
                </div>
              )}
              {r.revisionHumana && (
                <EstadoVacio className="p-3">
                  <UserRoundCheck className="mr-1 inline size-4" aria-hidden />
                  La IA no ha podido corregirla con seguridad: la revisará tu profesor.
                </EstadoVacio>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
