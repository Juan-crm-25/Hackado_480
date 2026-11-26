"use client";

import { BadgeCheck, ChevronDown, CircleCheck, CircleDashed, Lock, Timer } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import { EstadoVacio } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { VideoYoutube } from "@/components/video-youtube";
import type { ClaseCatalogo } from "@/lib/catalogo-bd";
import { cn } from "@/lib/utils";
import { duracionAccesible, duracionVideo } from "@/lib/youtube";
import {
  acumularReproduccion,
  alcanzaVisto,
  alternarAbierta,
  type EventoReproduccion,
  REPRODUCCION_INICIAL,
  SEGUNDOS_PARA_VISTO,
  textoContador,
  textoPausa,
} from "./reproduccion";
import { type PreguntaDemo, preguntaDeClase } from "./tests-demo";
import { claveTests, desbloqueadas, esCorrecta, superarTest } from "./tests-modulo";
import { type AlmacenVistos, claveVistos, leerTextoVistos, marcarVisto, vistosDeTexto } from "./vistos";

/** localStorage si existe y se deja leer (puede lanzar con el almacenamiento bloqueado). */
function almacenLocal(): AlmacenVistos | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Avisos de cambios en esta pestaña; los de otras pestañas llegan con el evento «storage».
const oyentes = new Set<() => void>();
function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  window.addEventListener("storage", avisar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

/**
 * Vídeos del módulo como acordeón: cada clase es una fila plegada (título, duración y «Visto» / «No visto»)
 * que al pulsarla se abre y muestra el reproductor; plegada no se carga nada de YouTube.
 * Un vídeo pasa a «Visto» tras 15 s de reproducción real (no al abrirlo; ver `reproduccion.ts`), se guarda
 * en este navegador (ver `vistos.ts`) y arriba se ve el progreso.
 * Debajo de cada vídeo hay un test (de demostración hasta la issue #3): el siguiente vídeo está bloqueado
 * hasta superar el test del anterior, sin necesidad de verlo (ver `tests-modulo.ts`). El primero siempre está abierto.
 * En el servidor nada está visto ni superado; lo guardado se lee al hidratar (useSyncExternalStore).
 */
export function VideosModulo({
  cursoSlug,
  moduloSlug,
  clases,
}: {
  cursoSlug: string;
  moduloSlug: string;
  clases: ClaseCatalogo[];
}) {
  const clave = claveVistos(cursoSlug, moduloSlug);
  const texto = useSyncExternalStore(
    suscribir,
    () => leerTextoVistos(almacenLocal(), clave),
    () => null,
  );
  const vistos = useMemo(() => vistosDeTexto(texto), [texto]);
  const claveTest = claveTests(cursoSlug, moduloSlug);
  const textoTests = useSyncExternalStore(
    suscribir,
    () => leerTextoVistos(almacenLocal(), claveTest),
    () => null,
  );
  const superados = useMemo(() => vistosDeTexto(textoTests), [textoTests]);
  const abiertasPorTest = desbloqueadas(clases, superados);
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set());
  const base = useId();

  const total = clases.length;
  const numVistos = clases.filter((c) => vistos.has(c.id)).length;
  const resumen = `${numVistos} de ${total} vídeos vistos`;
  const numSuperados = clases.filter((c) => superados.has(c.id)).length;

  function alternar(claseId: string) {
    setAbiertas((previas) => alternarAbierta(previas, claseId));
  }

  function marcar(claseId: string) {
    marcarVisto(almacenLocal(), clave, claseId);
    oyentes.forEach((avisar) => avisar());
  }

  function superar(claseId: string) {
    superarTest(almacenLocal(), claveTest, claseId);
    oyentes.forEach((avisar) => avisar());
  }

  return (
    <div className="flex flex-col gap-4">
      <Progress value={numVistos} max={total} getAriaValueText={() => resumen} className="gap-2">
        <ProgressLabel className="text-sm text-muted-foreground">{resumen}</ProgressLabel>
        <span className="ms-auto inline-flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
          <BadgeCheck className="size-4" aria-hidden />
          {numSuperados} de {total} tests superados
        </span>
      </Progress>

      <ol className="flex flex-col gap-2">
        {clases.map((clase, i) => {
          const bloqueada = !abiertasPorTest.has(clase.id);
          const abierta = !bloqueada && abiertas.has(clase.id);
          const visto = vistos.has(clase.id);
          const superado = superados.has(clase.id);
          const idBoton = `${base}-boton-${clase.id}`;
          const idPanel = `${base}-panel-${clase.id}`;
          const idBloqueo = `${base}-bloqueo-${clase.id}`;
          return (
            <li key={clase.id} className="rounded-lg border bg-card">
              <h3>
                <button
                  type="button"
                  id={idBoton}
                  aria-expanded={bloqueada ? undefined : abierta}
                  aria-controls={idPanel}
                  aria-disabled={bloqueada || undefined}
                  aria-describedby={bloqueada ? idBloqueo : undefined}
                  onClick={() => {
                    if (!bloqueada) alternar(clase.id);
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150 ease-in-out focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
                    bloqueada ? "cursor-not-allowed" : "hover:bg-muted",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-base font-semibold">
                      <span className="text-muted-foreground">{i + 1}.</span> {clase.titulo}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span aria-hidden>{duracionVideo(clase.duracionSegundos)}</span>
                      <span className="sr-only">Duración: {duracionAccesible(clase.duracionSegundos)}.</span>
                      <EstadoVisto visto={visto} />
                      {superado && <TestSuperado />}
                    </span>
                  </span>
                  {bloqueada ? (
                    <Lock aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-5 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out",
                        abierta && "rotate-180",
                      )}
                    />
                  )}
                </button>
              </h3>
              {bloqueada && (
                <p id={idBloqueo} className="flex items-center gap-2 px-3 pb-3 text-sm text-muted-foreground">
                  <Lock aria-hidden className="size-4 shrink-0" />
                  Bloqueado · supera el test de «{clases[i - 1]?.titulo}» para desbloquearlo
                </p>
              )}
              <div
                id={idPanel}
                role="region"
                aria-labelledby={idBoton}
                hidden={!abierta}
                className="px-3 pb-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              >
                {abierta && (
                  <div className="flex flex-col gap-4">
                    {clase.youtubeId ? (
                    <ReproductorClase
                      youtubeId={clase.youtubeId}
                      titulo={clase.titulo}
                      visto={visto}
                      onVisto={() => marcar(clase.id)}
                    />
                  ) : (
                    <EstadoVacio>
                      Este vídeo no se puede incrustar.{" "}
                      <a
                        href={clase.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        Ábrelo en una pestaña nueva
                      </a>
                      .
                    </EstadoVacio>
                    )}
                    <TestVideo
                      tituloVideo={clase.titulo}
                      pregunta={preguntaDeClase(clase.id)}
                      superado={superado}
                      onSuperado={() => superar(clase.id)}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** «Visto» con relleno verde, texto carbón e icono; «No visto» en gris con otro icono: nunca solo el color. */
function EstadoVisto({ visto }: { visto: boolean }) {
  return visto ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-surface-dark">
      <CircleCheck className="size-3.5" aria-hidden />
      Visto
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <CircleDashed className="size-3.5" aria-hidden />
      No visto
    </span>
  );
}

/**
 * Reproductor de una clase que cuenta el tiempo de reproducción real: con el vídeo sonando suma un
 * segundo cada segundo y, al llegar a 15 s, llama a `onVisto` y lo anuncia una vez a los lectores de pantalla.
 * Si se pliega la fila antes de los 15 s, la cuenta vuelve a empezar al abrirla de nuevo.
 */
export function ReproductorClase({
  youtubeId,
  titulo,
  visto,
  onVisto,
}: {
  youtubeId: string;
  titulo: string;
  visto: boolean;
  onVisto: () => void;
}) {
  const [estado, despachar] = useReducer(
    (previo: typeof REPRODUCCION_INICIAL, accion: { evento: EventoReproduccion; ahoraMs: number }) =>
      acumularReproduccion(previo, accion.evento, accion.ahoraMs),
    REPRODUCCION_INICIAL,
  );
  const alReproducir = useCallback(
    (reproduciendo: boolean) => despachar({ evento: { tipo: "estado", reproduciendo }, ahoraMs: Date.now() }),
    [],
  );
  const contando = estado.reproduciendo && !visto;
  const completado = alcanzaVisto(estado);

  useEffect(() => {
    if (!contando) return;
    const intervalo = window.setInterval(() => despachar({ evento: { tipo: "tick" }, ahoraMs: Date.now() }), 1000);
    return () => window.clearInterval(intervalo);
  }, [contando]);

  useEffect(() => {
    if (completado && !visto) onVisto();
  }, [completado, visto, onVisto]);

  return (
    <div className="flex flex-col gap-2">
      <VideoYoutube youtubeId={youtubeId} titulo={titulo} onReproduciendo={alReproducir} />
      <ContadorVisto segundos={estado.segundos} reproduciendo={estado.reproduciendo} visto={visto} />
      <p aria-live="polite" className="sr-only">
        {completado ? "Vídeo marcado como visto" : ""}
      </p>
    </div>
  );
}

/** Cuenta visible hasta el «Visto», en texto (no solo color). Ya visto no se muestra. */
export function ContadorVisto({
  segundos,
  reproduciendo,
  visto,
}: {
  segundos: number;
  reproduciendo: boolean;
  visto: boolean;
}) {
  if (visto) return null;
  const texto = reproduciendo
    ? textoContador(segundos)
    : segundos > 0
      ? textoPausa(segundos)
      : `Se marca como visto tras ${SEGUNDOS_PARA_VISTO} s de reproducción`;
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Timer className="size-4 shrink-0" aria-hidden />
      <span className="tabular-nums">{texto}</span>
    </p>
  );
}

/** «Test superado» con icono: nunca solo el color. */
function TestSuperado() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-surface-dark">
      <BadgeCheck className="size-3.5" aria-hidden />
      Test superado
    </span>
  );
}

/**
 * «Test del vídeo»: una pregunta de 3 opciones. Test de demostración · el test definitivo llega con la issue #3.
 * Acertar llama a `onSuperado` (desbloquea el siguiente vídeo); fallar deja volver a intentarlo.
 */
export function TestVideo({
  tituloVideo,
  pregunta,
  superado,
  onSuperado,
}: {
  tituloVideo: string;
  pregunta: PreguntaDemo;
  superado: boolean;
  onSuperado: () => void;
}) {
  const [opcion, setOpcion] = useState<number | null>(null);
  const [fallo, setFallo] = useState(false);
  const nombre = useId();
  const idTitulo = `${nombre}-titulo`;

  function comprobar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (opcion === null) return;
    if (esCorrecta(pregunta, opcion)) {
      setFallo(false);
      onSuperado();
    } else {
      setFallo(true);
    }
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-lg border bg-muted p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={idTitulo} className="text-base font-semibold">
          Test del vídeo <span className="sr-only">«{tituloVideo}»</span>
        </h4>
        {superado && <TestSuperado />}
      </div>
      <p className="text-xs text-muted-foreground">Test de demostración · el test definitivo llega con la issue #3</p>
      {superado ? (
        <p className="text-sm">Has superado este test: el siguiente vídeo ya está desbloqueado.</p>
      ) : (
        <form onSubmit={comprobar} className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{pregunta.enunciado}</legend>
            {pregunta.opciones.map((texto, i) => (
              <label
                key={texto}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  name={nombre}
                  value={i}
                  checked={opcion === i}
                  onChange={() => {
                    setOpcion(i);
                    setFallo(false);
                  }}
                  className="size-4 accent-primary"
                />
                {texto}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={opcion === null}>
              Comprobar
            </Button>
            <p aria-live="polite" className="text-sm">
              {fallo ? "No es correcta, vuelve a intentarlo" : ""}
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
