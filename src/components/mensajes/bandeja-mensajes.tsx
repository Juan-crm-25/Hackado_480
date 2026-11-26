"use client";

/**
 * Bandeja de mensajes SIMULADA para el MVP: no hay backend ni BBDD de mensajes.
 * Las conversaciones salen de src/lib/demo/mensajes.ts y lo que se envía solo se añade al estado del
 * navegador (se pierde al recargar). Sirve para enseñar en la demo que se puede escribir al profesor.
 *
 * <ProveedorMensajes> (montado en el layout de la app) guarda el estado y pinta el panel una sola vez;
 * el icono de la barra superior y el botón «Enviar mensaje» de la tarjeta del profesor lo abren.
 */
import { ArrowLeft, Check, MessageSquare, Send } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { totalNoLeidos, type Conversacion } from "@/lib/demo/mensajes";
import { cn } from "@/lib/utils";
import { estadoInicial, reducirBandeja, type AccionBandeja, type EstadoBandeja } from "./bandeja";

interface ContextoMensajes {
  estado: EstadoBandeja;
  despachar: (accion: AccionBandeja) => void;
}

// Sin proveedor (p. ej. en los tests), los mensajes de ejemplo y acciones que no hacen nada.
const Contexto = createContext<ContextoMensajes>({ estado: estadoInicial(), despachar: () => {} });

export function useMensajes() {
  return useContext(Contexto);
}

export function ProveedorMensajes({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducirBandeja, undefined, estadoInicial);
  const valor = useMemo(() => ({ estado, despachar }), [estado]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <BandejaMensajes />
    </Contexto.Provider>
  );
}

// Zona horaria fija: el servidor y el navegador pintan la misma hora (sin saltos de hidratación).
const formatoHora = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function Hora({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} className={cn("text-xs text-muted-foreground", className)}>
      {formatoHora.format(new Date(iso))}
    </time>
  );
}

/** Icono de mensajes de la barra superior, con el contador de no leídos (también en la etiqueta). */
export function BotonMensajesVista({ noLeidos, onClick }: { noLeidos: number; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative rounded-full"
      aria-label={noLeidos > 0 ? `Mensajes, ${noLeidos} sin leer` : "Mensajes"}
      onClick={onClick}
    >
      <MessageSquare className="size-5" aria-hidden />
      {noLeidos > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-5 font-bold text-primary-foreground"
        >
          {noLeidos}
        </span>
      )}
    </Button>
  );
}

export function BotonMensajes() {
  const { estado, despachar } = useMensajes();
  return <BotonMensajesVista noLeidos={totalNoLeidos(estado.conversaciones)} onClick={() => despachar({ tipo: "abrir" })} />;
}

/** «Enviar mensaje» a una persona: abre la bandeja en su conversación (la crea si no existe). */
export function BotonEnviarMensaje({ conversacion, nombre, rol }: { conversacion: string; nombre: string; rol: string }) {
  const { despachar } = useMensajes();
  return (
    <Button variant="outline" onClick={() => despachar({ tipo: "abrir", id: conversacion, nombre, rol })}>
      <MessageSquare aria-hidden />
      Enviar mensaje
    </Button>
  );
}

export function ListaConversaciones({
  conversaciones,
  onAbrir,
}: {
  conversaciones: Conversacion[];
  onAbrir: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {conversaciones.map((c) => {
        const ultimo = c.mensajes.at(-1);
        return (
          <li key={c.id} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => onAbrir(c.id)}
              className="flex min-h-11 w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-150 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate", c.noLeidos > 0 ? "font-bold" : "font-medium")}>{c.nombre}</span>
                {ultimo && <Hora iso={ultimo.hora} className="shrink-0" />}
              </span>
              {c.rol && <span className="text-xs text-muted-foreground">{c.rol}</span>}
              <span className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm text-muted-foreground">
                  {ultimo ? `${ultimo.autor === "yo" ? "Tú: " : ""}${ultimo.texto}` : "Sin mensajes todavía"}
                </span>
                {c.noLeidos > 0 && (
                  <span className="shrink-0 rounded-full bg-primary px-2 text-xs leading-5 font-bold text-primary-foreground">
                    {c.noLeidos} sin leer
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function VistaConversacion({
  conversacion,
  onVolver,
  onEnviar,
}: {
  conversacion: Conversacion;
  onVolver: () => void;
  onEnviar: (texto: string) => void;
}) {
  // El borrador vive aquí: se pierde al cerrar el panel o cambiar de conversación (el componente se desmonta).
  const [borrador, setBorrador] = useState("");
  const final = useRef<HTMLLIElement>(null);
  const total = conversacion.mensajes.length;

  useEffect(() => {
    final.current?.scrollIntoView({ block: "end" });
  }, [total]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!borrador.trim()) return;
    onEnviar(borrador);
    setBorrador("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b px-2 py-1">
        <Button variant="ghost" size="icon" onClick={onVolver} aria-label="Volver a los mensajes">
          <ArrowLeft aria-hidden />
        </Button>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{conversacion.nombre}</span>
          {conversacion.rol && <span className="truncate text-xs text-muted-foreground">{conversacion.rol}</span>}
        </div>
      </div>

      <ol aria-label={`Conversación con ${conversacion.nombre}`} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {total === 0 && <li className="text-center text-sm text-muted-foreground">Escribe el primer mensaje.</li>}
        {conversacion.mensajes.map((m) => {
          const mio = m.autor === "yo";
          return (
            <li key={m.id} className={cn("flex max-w-[85%] flex-col gap-1", mio ? "items-end self-end" : "items-start self-start")}>
              {/* Quién lo dice, en texto (no solo por el color o el lado). */}
              <span className="text-xs font-medium text-muted-foreground">{mio ? "Tú" : conversacion.nombre}</span>
              <p
                className={cn(
                  "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  mio ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                {m.texto}
              </p>
              <span className="flex items-center gap-1">
                <Hora iso={m.hora} />
                {m.estado === "enviado" && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Check className="size-3" aria-hidden />
                    Enviado
                  </span>
                )}
              </span>
            </li>
          );
        })}
        <li ref={final} aria-hidden />
      </ol>

      <form onSubmit={enviar} className="flex items-end gap-2 border-t p-3">
        <label htmlFor="mensaje-nuevo" className="sr-only">
          Mensaje para {conversacion.nombre}
        </label>
        <Textarea
          id="mensaje-nuevo"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Escribe un mensaje…"
          className="min-h-11 flex-1 resize-none"
        />
        <Button type="submit" disabled={!borrador.trim()}>
          <Send aria-hidden />
          Enviar
        </Button>
      </form>
    </div>
  );
}

/** Panel de la bandeja: a pantalla completa en móvil, a la derecha en tableta y web. */
function BandejaMensajes() {
  const { estado, despachar } = useMensajes();
  const activa = estado.conversaciones.find((c) => c.id === estado.activa) ?? null;

  return (
    <Sheet open={estado.abierta} onOpenChange={(abierta) => !abierta && despachar({ tipo: "cerrar" })}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-14">
          <SheetTitle>Mensajes</SheetTitle>
          <SheetDescription>Simulación del MVP: los mensajes no salen de este navegador.</SheetDescription>
        </SheetHeader>
        {activa ? (
          <VistaConversacion
            key={activa.id}
            conversacion={activa}
            onVolver={() => despachar({ tipo: "lista" })}
            onEnviar={(texto) =>
              despachar({ tipo: "enviar", id: activa.id, texto, mensajeId: crypto.randomUUID(), hora: new Date().toISOString() })
            }
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ListaConversaciones conversaciones={estado.conversaciones} onAbrir={(id) => despachar({ tipo: "abrir", id })} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
