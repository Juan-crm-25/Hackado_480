/**
 * Estado de la bandeja de mensajes SIMULADA del MVP (sin backend ni BBDD): reductor puro.
 * Enviar solo añade el mensaje en memoria, marcado como «enviado».
 */
import { conversacionesDemo, type Conversacion } from "@/lib/demo/mensajes";

export interface EstadoBandeja {
  abierta: boolean;
  /** Conversación abierta, o null para ver la lista. */
  activa: string | null;
  conversaciones: Conversacion[];
}

export type AccionBandeja =
  /** Abre la bandeja; con `id`, en esa conversación (la crea vacía si no existe, con `nombre` y `rol`). */
  | { tipo: "abrir"; id?: string; nombre?: string; rol?: string }
  | { tipo: "lista" }
  | { tipo: "cerrar" }
  /** `mensajeId` y `hora` llegan de fuera para que el reductor sea puro. */
  | { tipo: "enviar"; id: string; texto: string; mensajeId: string; hora: string };

export function estadoInicial(): EstadoBandeja {
  return { abierta: false, activa: null, conversaciones: conversacionesDemo };
}

export function reducirBandeja(estado: EstadoBandeja, accion: AccionBandeja): EstadoBandeja {
  switch (accion.tipo) {
    case "abrir": {
      const { id } = accion;
      if (!id) return { ...estado, abierta: true, activa: null };
      const existe = estado.conversaciones.some((c) => c.id === id);
      const conversaciones = existe
        ? estado.conversaciones.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c))
        : [{ id, nombre: accion.nombre ?? id, rol: accion.rol ?? "", noLeidos: 0, mensajes: [] }, ...estado.conversaciones];
      return { abierta: true, activa: id, conversaciones };
    }
    case "lista":
      return { ...estado, activa: null };
    case "cerrar":
      return { ...estado, abierta: false, activa: null };
    case "enviar": {
      const texto = accion.texto.trim();
      if (!texto) return estado;
      return {
        ...estado,
        conversaciones: estado.conversaciones.map((c) =>
          c.id === accion.id
            ? { ...c, mensajes: [...c.mensajes, { id: accion.mensajeId, autor: "yo", texto, hora: accion.hora, estado: "enviado" }] }
            : c,
        ),
      };
    }
  }
}
