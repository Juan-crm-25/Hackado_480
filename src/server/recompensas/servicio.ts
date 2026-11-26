import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import { calcularPuntosRespuestas } from "@/lib/foro";
import { leerComentariosDeTemasConPuntos, sumarPuntosDelProfesor } from "./repositorio";

export interface PuntosDelAlumno {
  total: number;
  /**
   * Por sus respuestas valoradas en el foro (correcta +10, aproximada +5), con la misma regla anti-spam que el hilo (S12):
   * una vez por tema y solo las 3 primeras correctas de personas distintas. Se calculan, no se guardan.
   */
  respuestas: number;
  /** Los que le ha dado el profesor (+1, +3 o +6 por buena pregunta o buena conducta). */
  profesor: number;
}

/** Puntos del foro de un usuario, para su perfil y GET /api/yo/puntos. */
export async function obtenerPuntosDelAlumno(usuarioId: string, db: Db = getDb()): Promise<PuntosDelAlumno> {
  const [comentarios, profesor] = await Promise.all([leerComentariosDeTemasConPuntos(usuarioId, db), sumarPuntosDelProfesor(usuarioId, db)]);
  const porTema = Map.groupBy(comentarios, (c) => c.temaId);
  let respuestas = 0;
  for (const delTema of porTema.values()) {
    const puntos = calcularPuntosRespuestas(delTema);
    for (const c of delTema) if (c.autorId === usuarioId) respuestas += puntos.get(c.id) ?? 0;
  }
  return { total: respuestas + profesor, respuestas, profesor };
}
