"use client";

import { CircleCheck, Gift, Lock, Rocket, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { EstadoError } from "@/components/estado";
import { Confeti } from "@/components/foro/celebracion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PREMIOS, type Premio } from "@/lib/demo/premios";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import { cn } from "@/lib/utils";
import type { SaldoPremios } from "@/server/recompensas/servicio";
import { estadoPremio, posicionHito, rellenoBarra } from "./logica";
import { contar } from "@/lib/formato";

const NORMALES = PREMIOS.filter((p) => !p.legendario);
const LEGENDARIO = PREMIOS.find((p) => p.legendario);
const HITOS = NORMALES.map((p) => p.puntos);
const MAXIMO = HITOS[HITOS.length - 1];

/*
 * Al pasar por encima, cada premio crece (solo si el usuario acepta animaciones) y brilla con su color: una sola clase
 * de sombra con el token, para que cn() no la quite. El legendario crece más.
 */
const BASE_IMAGEN = "transition duration-200 ease-out";
const EFECTO: Record<string, string> = {
  "preguntas-tutor": "hover:drop-shadow-[0_0_14px_var(--color-brand)] motion-safe:group-hover:scale-120",
  "pato-480": "hover:drop-shadow-[0_0_14px_var(--color-promo-cyber-1)] motion-safe:group-hover:scale-120",
  "entradas-mwc": "hover:drop-shadow-[0_0_14px_var(--color-promo-navidad)] motion-safe:group-hover:scale-120",
  "viaje-esa": "hover:drop-shadow-[0_0_14px_var(--color-promo-oro)] motion-safe:group-hover:scale-140",
};

async function pedir(url: string, cuerpo?: unknown): Promise<SaldoPremios> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return leerRespuesta<SaldoPremios>(res);
}

/**
 * Premios del perfil: una barra de colores con los premios encima de cada hito y, debajo, sus puntos y el botón de canje.
 * El premio legendario (9999 puntos) va aparte, con su propia barra. El saldo y los canjes son de la BBDD: canjear resta
 * los puntos del premio (POST /api/yo/premios/canje). Es una SIMULACIÓN del MVP: no se entrega nada.
 * Los botones «+100 puntos» y «+1000 puntos» (POST /api/yo/premios/demo) permiten enseñarlo, porque en la demo nadie llega a 100.
 */
export function BarraPremios({ saldoInicial }: { saldoInicial: SaldoPremios }) {
  const [saldo, setSaldo] = useState(saldoInicial);
  const canjeados = useMemo(() => new Set(saldo.canjeados), [saldo.canjeados]);
  const [canjeando, setCanjeando] = useState<{ premio: Premio; hecho: boolean; enviando: boolean; error?: string } | null>(null);
  const [sumando, setSumando] = useState<number | null>(null);
  const [errorDemo, setErrorDemo] = useState<string | null>(null);

  const puntos = saldo.saldo;
  const relleno = rellenoBarra(puntos, HITOS);

  async function confirmar() {
    if (!canjeando || canjeando.enviando) return;
    const premio = canjeando.premio;
    setCanjeando({ premio, hecho: false, enviando: true });
    try {
      setSaldo(await pedir("/api/yo/premios/canje", { premio: premio.id }));
      setCanjeando({ premio, hecho: true, enviando: false });
    } catch (e) {
      setCanjeando({ premio, hecho: false, enviando: false, error: mensajeDeError(e) });
    }
  }

  async function sumarDemo(cantidad: 100 | 1000) {
    setSumando(cantidad);
    setErrorDemo(null);
    try {
      setSaldo(await pedir("/api/yo/premios/demo", { puntos: cantidad }));
    } catch (e) {
      setErrorDemo(mensajeDeError(e));
    } finally {
      setSumando(null);
    }
  }

  return (
    <section aria-labelledby="premios" className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm">
      {/* El título y al lado el total; debajo, en pequeño, de dónde sale cada punto. */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 id="premios" className="flex items-center gap-2 text-xl leading-tight font-bold">
            <Gift className="size-5" aria-hidden />
            Premios
          </h2>
          <p className="flex items-center gap-2 text-2xl font-bold whitespace-nowrap tabular-nums">
            <Trophy className="size-6 shrink-0" aria-hidden />
            {contar(puntos, "punto", "puntos")}
          </p>
        </div>
        {/* Dos filas, centradas en móvil para que no se vea apretado: lo ganado en el foro y, debajo, demo y canjes. */}
        <div className="text-center text-xs text-muted-foreground tabular-nums md:text-left">
          <p>{`${saldo.respuestas} por respuestas · ${saldo.profesor} del profesor`}</p>
          {/* Los canjes restan: «−» solo si hay alguno (nunca «−0»). */}
          <p>{`${saldo.demo} de demo · ${saldo.canjeado > 0 ? "−" : ""}${saldo.canjeado} canjeados`}</p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {/* Premios encima de cada hito: misma rejilla que los hitos de la barra. */}
        <ul aria-hidden className="grid grid-cols-3 gap-2">
          {NORMALES.map((p) => (
            <li key={p.id} className="group flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen local pequeña; el nombre va debajo en texto */}
              <img
                src={p.imagen}
                alt=""
                width={80}
                height={80}
                loading="lazy"
                className={cn("h-16 w-auto object-contain md:h-20", BASE_IMAGEN, EFECTO[p.id])}
              />
            </li>
          ))}
        </ul>

        <div
          role="progressbar"
          aria-label="Puntos hacia los premios"
          aria-valuemin={0}
          aria-valuemax={MAXIMO}
          aria-valuenow={Math.min(Math.max(puntos, 0), MAXIMO)}
          aria-valuetext={`${puntos} puntos`}
          className="relative h-5 rounded-full bg-muted"
        >
          <div
            className="relative h-full overflow-hidden rounded-full bg-linear-to-r from-brand via-brand-cyan to-brand-coral transition-[width] duration-700 ease-out"
            style={{ width: `${relleno}%` }}
          >
            <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent motion-safe:animate-brillo" />
          </div>
          {HITOS.map((hito, i) => {
            const alcanzado = puntos >= hito;
            return (
              <span
                key={hito}
                aria-hidden
                style={{ left: `${posicionHito(i, HITOS.length)}%` }}
                className={cn(
                  "absolute top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-card",
                  alcanzado ? "bg-brand text-surface-dark" : "bg-muted-foreground/40",
                )}
              >
                {alcanzado && <CircleCheck className="size-4" />}
              </span>
            );
          })}
        </div>

        {/*
          Nombre, puntos y botón en tres filas compartidas (subgrid): aunque un nombre ocupe más líneas, los puntos y
          los botones de los tres premios quedan a la misma altura.
        */}
        <ul className="grid grid-cols-3 grid-rows-[auto_auto_auto] gap-x-2 gap-y-1">
          {NORMALES.map((p) => (
            <li key={p.id} className="row-span-3 grid grid-rows-subgrid justify-items-center text-center">
              <p className="self-start text-xs leading-tight font-semibold">{p.nombre}</p>
              <p className="self-center text-sm font-bold tabular-nums">{`${p.puntos} pts`}</p>
              <AccionPremio
                premio={p}
                puntos={puntos}
                canjeados={canjeados}
                onCanjear={() => setCanjeando({ premio: p, hecho: false, enviando: false })}
              />
            </li>
          ))}
        </ul>
      </div>

      {LEGENDARIO && (
        <PremioLegendario
          premio={LEGENDARIO}
          puntos={puntos}
          canjeados={canjeados}
          onCanjear={() => setCanjeando({ premio: LEGENDARIO, hecho: false, enviando: false })}
        />
      )}

      <div className="flex flex-col gap-2">
        {/* Uno al lado del otro; el texto visible es corto y la etiqueta accesible dice que son puntos de demo. */}
        <div className="flex flex-wrap gap-2">
          {([100, 1000] as const).map((cantidad) => (
            <Button
              key={cantidad}
              type="button"
              variant="outline"
              aria-label={`Sumar ${cantidad} puntos de demo`}
              disabled={sumando !== null}
              onClick={() => sumarDemo(cantidad)}
            >
              {sumando === cantidad ? "Sumando…" : `+${cantidad} puntos`}
            </Button>
          ))}
        </div>
        {errorDemo && <EstadoError>{errorDemo}</EstadoError>}
      </div>

      <Dialog open={canjeando !== null} onOpenChange={(abierto) => !abierto && setCanjeando(null)}>
        {canjeando && (
          <DialogContent>
            {canjeando.hecho && <Confeti />}
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {canjeando.hecho ? "¡Premio canjeado!" : `¿Canjear «${canjeando.premio.nombre}»?`}
              </DialogTitle>
              <DialogDescription>
                {canjeando.hecho
                  ? `Te quedan ${puntos} puntos. Es una simulación del MVP: en un caso real te escribiríamos para entregártelo.`
                  : `${canjeando.premio.descripcion} Se restarán ${canjeando.premio.puntos} puntos de tu saldo.`}
              </DialogDescription>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen local decorativa */}
            <img src={canjeando.premio.imagen} alt="" className="mx-auto h-32 w-auto object-contain" />
            {canjeando.error && <EstadoError>{canjeando.error}</EstadoError>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose render={<Button type="button" variant="outline" />}>
                {canjeando.hecho ? "Cerrar" : "Cancelar"}
              </DialogClose>
              {!canjeando.hecho && (
                <Button type="button" variant="accent" disabled={canjeando.enviando} onClick={confirmar}>
                  {canjeando.enviando ? "Canjeando…" : `Canjear por ${canjeando.premio.puntos} puntos`}
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

/** Botón «Canjear», «Canjeado» o los puntos que faltan; nunca un botón deshabilitado sin explicación. */
function AccionPremio({
  premio,
  puntos,
  canjeados,
  onCanjear,
}: {
  premio: Premio;
  puntos: number;
  canjeados: ReadonlySet<string>;
  onCanjear: () => void;
}) {
  const estado = estadoPremio(puntos, premio, canjeados);
  if (estado.tipo === "canjeado") {
    return (
      <Badge className="min-h-7 bg-brand text-surface-dark">
        <CircleCheck aria-hidden />
        Canjeado
      </Badge>
    );
  }
  if (estado.tipo === "disponible") {
    return (
      <Button type="button" className="w-full max-w-32" onClick={onCanjear}>
        Canjear
      </Button>
    );
  }
  return (
    <p className="inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground">
      <Lock className="size-3.5 shrink-0" aria-hidden />
      {`Faltan ${estado.faltan}`}
    </p>
  );
}

/** El premio final, aparte: su imagen, su descripción y una barra propia hasta sus puntos. */
function PremioLegendario({
  premio,
  puntos,
  canjeados,
  onCanjear,
}: {
  premio: Premio;
  puntos: number;
  canjeados: ReadonlySet<string>;
  onCanjear: () => void;
}) {
  const porcentaje = Math.min(100, (Math.max(0, puntos) / premio.puntos) * 100);
  return (
    <article className="flex flex-col gap-4 rounded-xl bg-surface-dark p-5 text-white sm:flex-row sm:items-center">
      <div className="group flex shrink-0 justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen local decorativa; el nombre va en texto */}
        <img
          src={premio.imagen}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          className={cn("h-28 w-auto object-contain", BASE_IMAGEN, EFECTO[premio.id])}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 uppercase">
          <Rocket className="size-4" aria-hidden />
          Premio legendario
        </p>
        <h3 className="text-xl leading-tight font-bold">{premio.nombre}</h3>
        <p className="text-sm text-white/80">{premio.descripcion}</p>
        <div
          role="progressbar"
          aria-label={`Puntos hacia ${premio.nombre}`}
          aria-valuemin={0}
          aria-valuemax={premio.puntos}
          aria-valuenow={Math.min(Math.max(puntos, 0), premio.puntos)}
          aria-valuetext={`${puntos} de ${premio.puntos} puntos`}
          className="h-3 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-brand-cyan to-brand-coral transition-[width] duration-700 ease-out"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold tabular-nums">{`${premio.puntos} pts`}</p>
          <div className="[&_p]:text-white/80">
            <AccionPremio premio={premio} puntos={puntos} canjeados={canjeados} onCanjear={onCanjear} />
          </div>
        </div>
      </div>
    </article>
  );
}
