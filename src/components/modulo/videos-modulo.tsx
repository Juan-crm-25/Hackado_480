"use client";

import { BadgeCheck, ChevronDown, CircleCheck, CircleDashed, CircleX, Lock, Timer } from "lucide-react";
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
import { EstadoCargando, EstadoError, EstadoVacio } from "@/components/estado";
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import { PreguntaDelTest } from "@/components/test-modulo/pantalla-test";
import { type Respuestas, cuantasRespondidas } from "@/components/test-modulo/logica";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { VideoYoutube } from "@/components/video-youtube";
import type { ClaseCatalogo } from "@/lib/catalogo-bd";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import type { EjercicioPublico, PeticionTestVideo, ResultadoTestVideo, TestsVideos } from "@/lib/types";
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
import { PanelEstudio } from "./panel-estudio";
import { claveTests, desbloqueadas, superarTest } from "./tests-modulo";
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
 * Debajo de cada vídeo hay un test de 2 preguntas del banco (#3, `/api/modulos/:id/tests-videos`): el siguiente vídeo
 * está bloqueado hasta superar el test del anterior, sin necesidad de verlo (ver `tests-modulo.ts`). El primero siempre
 * está abierto, y un vídeo sin preguntas aprobadas no bloquea el siguiente.
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
  const { tests, recargar } = useTestsVideos(moduloSlug);
  const sinTest = useMemo(
    () => new Set(tests.estado === "ok" ? clases.filter((c) => !tests.porVideo[c.id]?.length).map((c) => c.id) : []),
    [tests, clases],
  );
  const abiertasPorTest = desbloqueadas(clases, superados, sinTest);
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
                    <PanelEstudio
                      moduloSlug={moduloSlug}
                      video={{ id: clase.id, titulo: clase.titulo, youtubeId: clase.youtubeId ?? "" }}
                    />
                    <TestVideo
                      tituloVideo={clase.titulo}
                      moduloSlug={moduloSlug}
                      video={{ id: clase.id, titulo: clase.titulo, youtubeId: clase.youtubeId ?? "" }}
                      preguntas={tests.estado === "ok" ? (tests.porVideo[clase.id] ?? []) : null}
                      error={tests.estado === "error" ? tests.mensaje : undefined}
                      onReintentar={recargar}
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

type EstadoTests = { estado: "cargando" } | { estado: "error"; mensaje: string } | { estado: "ok"; porVideo: TestsVideos["porVideo"] };

/** Las preguntas del test de cada vídeo del módulo, pedidas una vez a la API al abrir la pantalla. */
function useTestsVideos(moduloSlug: string) {
  const [tests, setTests] = useState<EstadoTests>({ estado: "cargando" });
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    fetch(`/api/modulos/${encodeURIComponent(moduloSlug)}/tests-videos`)
      .then((res) => leerRespuesta<TestsVideos>(res))
      .then(
        (r) => vigente && setTests({ estado: "ok", porVideo: r.porVideo }),
        (e: unknown) => vigente && setTests({ estado: "error", mensaje: mensajeDeError(e) }),
      );
    return () => {
      vigente = false;
    };
  }, [moduloSlug, intento]);
  const recargar = useCallback(() => {
    setTests({ estado: "cargando" });
    setIntento((n) => n + 1);
  }, []);
  return { tests, recargar };
}

/**
 * «Test del vídeo» (#3): las preguntas del banco para este vídeo (2, de test o respuesta corta; siempre las mismas).
 * Acertarlas todas llama a `onSuperado` (desbloquea el siguiente vídeo); si falla alguna, se ve la corrección con el
 * minuto del vídeo que hay que repasar y se puede volver a intentar. `preguntas` es null mientras se cargan.
 */
export function TestVideo({
  tituloVideo,
  moduloSlug,
  video,
  preguntas,
  error,
  onReintentar,
  superado,
  onSuperado,
}: {
  tituloVideo: string;
  moduloSlug: string;
  video: VideoResumen;
  preguntas: EjercicioPublico[] | null;
  error?: string;
  onReintentar: () => void;
  superado: boolean;
  onSuperado: () => void;
}) {
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [comprobando, setComprobando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTestVideo | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const idTitulo = `${useId()}-titulo`;

  async function comprobar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preguntas?.length || comprobando) return;
    setComprobando(true);
    setErrorEnvio(null);
    try {
      const peticion: PeticionTestVideo = {
        videoId: video.id,
        respuestas: preguntas.map((p) => {
          const r = respuestas[p.id];
          return { ejercicioId: p.id, respuesta: typeof r === "number" ? r : (r ?? "").trim() };
        }),
      };
      const res = await fetch(`/api/modulos/${encodeURIComponent(moduloSlug)}/tests-videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peticion),
      });
      const r = await leerRespuesta<ResultadoTestVideo>(res);
      setResultado(r);
      if (r.superado) onSuperado();
    } catch (err) {
      setErrorEnvio(mensajeDeError(err));
    } finally {
      setComprobando(false);
    }
  }

  let contenido: React.ReactNode;
  if (superado) {
    contenido = <p className="text-sm">Has superado este test: el siguiente vídeo ya está desbloqueado.</p>;
  } else if (preguntas === null) {
    contenido = error ? (
      <div className="flex flex-col items-start gap-2">
        <EstadoError>{error}</EstadoError>
        <Button type="button" variant="outline" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    ) : (
      <EstadoCargando texto="Cargando el test…" />
    );
  } else if (preguntas.length === 0) {
    contenido = <p className="text-sm">Este vídeo todavía no tiene test: el siguiente ya está abierto.</p>;
  } else {
    const completas = cuantasRespondidas(preguntas, respuestas) === preguntas.length;
    contenido = (
      <form onSubmit={comprobar} className="flex flex-col gap-3">
        <ol className="flex flex-col gap-3">
          {preguntas.map((p, i) => (
            <li key={p.id}>
              <PreguntaDelTest
                pregunta={p}
                numero={i + 1}
                total={preguntas.length}
                respuesta={respuestas[p.id]}
                desactivada={comprobando}
                onCambiar={(r) => {
                  setRespuestas((antes) => ({ ...antes, [p.id]: r }));
                  setResultado(null);
                }}
              />
            </li>
          ))}
        </ol>
        {resultado && !resultado.superado && <CorreccionTestVideo resultado={resultado} video={video} />}
        {errorEnvio && <EstadoError>{errorEnvio}</EstadoError>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!completas || comprobando}>
            {comprobando ? "Comprobando…" : resultado ? "Volver a comprobar" : "Comprobar"}
          </Button>
          <p aria-live="polite" className="text-sm">
            {resultado && !resultado.superado ? "Alguna no es correcta: repasa y vuelve a intentarlo" : ""}
          </p>
        </div>
      </form>
    );
  }

  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-lg border bg-muted p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={idTitulo} className="text-base font-semibold">
          Test del vídeo <span className="sr-only">«{tituloVideo}»</span>
        </h4>
        {superado && <TestSuperado />}
      </div>
      {contenido}
    </section>
  );
}

/** Corrección del test de un vídeo: cada pregunta en texto (no solo color), su feedback y, si falla, el minuto que repasar. */
export function CorreccionTestVideo({ resultado, video }: { resultado: ResultadoTestVideo; video: VideoResumen }) {
  return (
    <ul className="flex flex-col gap-2">
      {resultado.resultados.map((r, i) => {
        const Icono = r.correcto ? CircleCheck : CircleX;
        return (
          <li key={r.ejercicioId} className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Icono className="size-4 shrink-0" aria-hidden />
              Pregunta {i + 1}: {r.correcto ? "Correcta" : "Incorrecta"}
            </p>
            {!r.correcto && (
              <>
                <p>
                  <TextoConCodigo texto={r.feedback} />
                </p>
                {r.repasar && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Repasa:</span>
                    <FuenteVideo fuente={r.repasar} videos={[video]} />
                  </div>
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
