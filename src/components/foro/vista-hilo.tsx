"use client";

import { Reply } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { EstadoError } from "@/components/estado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MotivoPuntos, PuntosProfesor } from "@/lib/foro";
import { mensajeDeError } from "@/lib/peticiones";
import { cn } from "@/lib/utils";
import type { ComentarioHilo, HiloForo } from "@/server/foro/servicio";
import { AutorForoLinea } from "./autor-foro";
import { CajaRespuesta } from "./caja-respuesta";
import { ControlesPuntos, SelectorValidacion, type ValidacionElegible } from "./controles-profesor";
import { InsigniaPuntos, InsigniaPuntosProfesor } from "./insignias";

export type DestinoPuntos = { temaId: string } | { comentarioId: string };

/** Lo que el hilo pide a la API. Cada acción lanza un Error con el mensaje para el usuario si falla. */
export interface AccionesHilo {
  responder: (cuerpo: string, respuestaAId?: string) => Promise<void>;
  validar: (comentarioId: string, validacion: ValidacionElegible) => Promise<void>;
  darPuntos: (destino: DestinoPuntos, puntos: PuntosProfesor, motivo: MotivoPuntos) => Promise<void>;
  quitarPuntos: (destino: DestinoPuntos) => Promise<void>;
}

interface Contexto {
  puedeDarPuntos: boolean;
  ocupado: boolean;
  respondiendoA: string | null;
  setRespondiendoA: (id: string | null) => void;
  ejecutar: (accion: () => Promise<void>) => Promise<boolean>;
  acciones: AccionesHilo;
}

/** Hilo de una duda: la duda, los comentarios en árbol y, para el profesor del curso, sus controles. */
export function VistaHilo({ hilo, acciones }: { hilo: HiloForo; acciones: AccionesHilo }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondiendoA, setRespondiendoA] = useState<string | null>(null);

  // Next 16 oculta la página con <Activity> al salir: se reinicia lo pasajero (patrón de auth/campos.tsx).
  useLayoutEffect(
    () => () => {
      setOcupado(false);
      setError(null);
      setRespondiendoA(null);
    },
    [],
  );

  async function ejecutar(accion: () => Promise<void>): Promise<boolean> {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      return true;
    } catch (e) {
      setError(mensajeDeError(e));
      return false;
    } finally {
      setOcupado(false);
    }
  }

  const ctx: Contexto = { puedeDarPuntos: hilo.puedeDarPuntos, ocupado, respondiendoA, setRespondiendoA, ejecutar, acciones };
  const { tema } = hilo;

  return (
    <div className="flex flex-col gap-4">
      <article className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <AutorForoLinea autor={tema.autor} creado={tema.creado} />
        <h3 className="text-lg leading-tight font-bold">{tema.titulo}</h3>
        <p className="max-w-prose text-base whitespace-pre-line">{tema.cuerpo}</p>
        <div className="flex flex-wrap gap-2">
          <InsigniaPuntosProfesor puntos={tema.puntosProfesor} />
        </div>
        {hilo.puedeDarPuntos && !tema.autor.esProfesor && !tema.autor.esIa && (
          <ControlesPuntos
            actual={tema.puntosProfesor}
            ocupado={ocupado}
            onDar={(p, m) => void ejecutar(() => acciones.darPuntos({ temaId: tema.id }, p, m))}
            onQuitar={() => void ejecutar(() => acciones.quitarPuntos({ temaId: tema.id }))}
          />
        )}
      </article>

      {error && <EstadoError>{error}</EstadoError>}

      {hilo.comentarios.length > 0 ? (
        <ol aria-label="Comentarios" className="flex flex-col gap-3">
          {hilo.comentarios.map((c) => (
            <ComentarioForo key={c.id} comentario={c} ctx={ctx} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Nadie ha comentado todavía. ¡Sé el primero en ayudar!</p>
      )}

      <CajaRespuesta
        etiqueta="Tu comentario"
        boton="Comentar"
        destacada
        ocupado={ocupado}
        onEnviar={(cuerpo) => ejecutar(() => acciones.responder(cuerpo))}
      />
    </div>
  );
}

function ComentarioForo({ comentario: c, ctx }: { comentario: ComentarioHilo; ctx: Contexto }) {
  const esAlumno = !c.autor.esIa && !c.autor.esProfesor;
  const respondiendo = ctx.respondiendoA === c.id;
  const nombre = c.autor.esIa ? "Sensei" : c.autor.nombre;

  return (
    <li className="flex flex-col gap-3">
      <article
        className={cn(
          "flex flex-col gap-2 p-3",
          c.autor.esIa ? "rounded-2xl rounded-tl-sm border border-chart-3/40 bg-chart-3/10" : "rounded-lg border bg-card",
        )}
      >
        <AutorForoLinea autor={c.autor} creado={c.creado} />
        <p className="max-w-prose text-base whitespace-pre-line">{c.cuerpo}</p>
        <div className="flex flex-wrap items-center gap-2 empty:hidden">
          <InsigniaPuntos puntos={c.puntos} />
          <InsigniaPuntosProfesor puntos={c.puntosProfesor} />
          {ctx.puedeDarPuntos && esAlumno && c.validacion === "pendiente" && <Badge variant="outline">Pendiente de revisar</Badge>}
        </div>

        {ctx.puedeDarPuntos && esAlumno && (
          <div className="flex flex-col gap-3">
            <SelectorValidacion
              valor={c.validacion}
              ocupado={ctx.ocupado}
              onCambiar={(v) => void ctx.ejecutar(() => ctx.acciones.validar(c.id, v))}
            />
            <ControlesPuntos
              actual={c.puntosProfesor}
              ocupado={ctx.ocupado}
              onDar={(p, m) => void ctx.ejecutar(() => ctx.acciones.darPuntos({ comentarioId: c.id }, p, m))}
              onQuitar={() => void ctx.ejecutar(() => ctx.acciones.quitarPuntos({ comentarioId: c.id }))}
            />
          </div>
        )}

        <div>
          <Button type="button" variant="ghost" aria-expanded={respondiendo} onClick={() => ctx.setRespondiendoA(respondiendo ? null : c.id)}>
            <Reply aria-hidden />
            Responder
          </Button>
        </div>
      </article>

      {respondiendo && (
        <div className="pl-4">
          <CajaRespuesta
            etiqueta={`Tu respuesta a ${nombre}`}
            boton="Enviar respuesta"
            ocupado={ctx.ocupado}
            onEnviar={async (cuerpo) => {
              const ok = await ctx.ejecutar(() => ctx.acciones.responder(cuerpo, c.id));
              if (ok) ctx.setRespondiendoA(null);
              return ok;
            }}
            onCancelar={() => ctx.setRespondiendoA(null)}
          />
        </div>
      )}

      {c.respuestas.length > 0 && (
        <ol aria-label={`Respuestas a ${nombre}`} className="flex flex-col gap-3 border-l-2 pl-3 md:pl-4">
          {c.respuestas.map((r) => (
            <ComentarioForo key={r.id} comentario={r} ctx={ctx} />
          ))}
        </ol>
      )}
    </li>
  );
}
