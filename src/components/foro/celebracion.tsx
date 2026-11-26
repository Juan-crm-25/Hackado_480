import { PartyPopper } from "lucide-react";
import type { CSSProperties } from "react";
import type { ComentarioHilo, HiloForo } from "@/server/foro/servicio";

function buscar(comentarios: ComentarioHilo[], id: string): ComentarioHilo | null {
  for (const c of comentarios) {
    if (c.id === id) return c;
    const dentro = buscar(c.respuestas, id);
    if (dentro) return dentro;
  }
  return null;
}

/**
 * Puntos que ha ganado mi comentario entre dos lecturas del hilo: los que tiene ahora menos los que tenía
 * (0 si aún no existía). Nunca negativo; 0 si sigue pendiente, no suma o no aparece.
 */
export function puntosGanados(antes: HiloForo | null, despues: HiloForo, comentarioId: string): number {
  const ahora = buscar(despues.comentarios, comentarioId)?.puntos ?? 0;
  const previos = antes ? (buscar(antes.comentarios, comentarioId)?.puntos ?? 0) : 0;
  return Math.max(0, ahora - previos);
}

/** Colores del confeti: solo tokens de la guía. */
const COLORES = ["bg-brand", "bg-brand-cyan", "bg-brand-coral", "bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];
const PIEZAS = 48;

/** Reparto fijo (sin Math.random) para que el servidor y el cliente pinten lo mismo. */
function pieza(i: number): { color: string; estilo: CSSProperties; forma: string } {
  return {
    color: COLORES[i % COLORES.length],
    forma: i % 3 === 0 ? "size-2 rounded-full" : "h-3 w-1.5 rounded-sm",
    estilo: {
      left: `${(i * 37) % 100}%`,
      animationDelay: `${(i * 53) % 400}ms`,
      animationDuration: `${1500 + ((i * 71) % 800)}ms`,
    },
  };
}

/** Confeti por toda la pantalla (~2,5 s). Decorativo: no se anuncia ni capta el ratón; con movimiento reducido no aparece. */
export function Confeti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden">
      {Array.from({ length: PIEZAS }, (_, i) => {
        const p = pieza(i);
        return <span key={i} style={p.estilo} className={`absolute -top-4 opacity-0 motion-safe:animate-confeti ${p.forma} ${p.color}`} />;
      })}
    </div>
  );
}

/** «+X puntos ganados» en píldora verde con texto carbón (el verde sobre blanco no llega al contraste), con confeti. */
export function Celebracion({ puntos }: { puntos: number }) {
  if (puntos <= 0) return null;
  return (
    <>
      <Confeti />
      <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
        <p
          role="status"
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-lg font-bold text-surface-dark shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:duration-300"
        >
          <PartyPopper className="size-5" aria-hidden />+{puntos} puntos ganados
        </p>
      </div>
    </>
  );
}
