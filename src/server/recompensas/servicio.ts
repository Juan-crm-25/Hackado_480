import "server-only";
import { getDb, type Db } from "@/lib/db/client";
import { PUNTOS_POR_VALIDACION } from "@/lib/foro";
import { contarComentariosPorValidacion, sumarPuntosDelProfesor } from "./repositorio";

export interface PuntosDelAlumno {
  total: number;
  /** Por sus respuestas valoradas en el foro (correcta +10, aproximada +5). Se calculan, no se guardan. */
  respuestas: number;
  /** Los que le ha dado el profesor (+1, +3 o +6 por buena pregunta o buena conducta). */
  profesor: number;
}

/** Puntos del foro de un usuario, para su perfil y GET /api/yo/puntos. */
export async function obtenerPuntosDelAlumno(usuarioId: string, db: Db = getDb()): Promise<PuntosDelAlumno> {
  const [porValidacion, profesor] = await Promise.all([contarComentariosPorValidacion(usuarioId, db), sumarPuntosDelProfesor(usuarioId, db)]);
  const respuestas = porValidacion.reduce((suma, f) => suma + PUNTOS_POR_VALIDACION[f.validacion] * f.total, 0);
  return { total: respuestas + profesor, respuestas, profesor };
}
