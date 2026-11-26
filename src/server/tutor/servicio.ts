import "server-only";
import { filtrarTexto } from "@/lib/ai/privacidad";
import { getDb, type Db } from "@/lib/db/client";
import type { Mensaje } from "@/lib/types";
import { guardarIntercambio } from "./repositorio";

export interface IntercambioSinFiltrar {
  usuarioId: string;
  moduloId: string;
  /** La pregunta tal como la escribió el alumno. */
  pregunta: string;
  /** Nombres que no pueden quedar guardados (el del alumno, como mínimo). */
  nombresOcultos: string[];
  respuesta: Mensaje;
}

/**
 * Guarda una consulta al tutor para el Radar (#5): conversaciones del alumno por módulo, que caducan a los 90 días.
 *
 * Se guarda SOLO el texto filtrado, el mismo que llegó a la IA (sin emails, teléfonos, DNI ni nombres).
 * La respuesta también se filtra: el modelo podría repetir algo de la pregunta.
 */
export async function registrarIntercambio(datos: IntercambioSinFiltrar, db: Db = getDb()): Promise<{ conversacionId: string }> {
  return guardarIntercambio(
    {
      usuarioId: datos.usuarioId,
      moduloId: datos.moduloId,
      pregunta: filtrarTexto(datos.pregunta, datos.nombresOcultos).texto,
      respuesta: {
        texto: filtrarTexto(datos.respuesta.texto, datos.nombresOcultos).texto,
        fuentes: datos.respuesta.fuentes ?? [],
      },
    },
    db,
  );
}
