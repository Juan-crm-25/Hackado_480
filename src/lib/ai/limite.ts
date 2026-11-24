/**
 * Límite diario de consultas a la IA por alumno: hace el coste máximo predecible (SPEC, apartado 9).
 * Se guarda en la tabla uso_ia, un contador por usuario y día. El día es el de UTC (empieza a la 1:00 o
 * las 2:00 en Madrid): mismo criterio en local, en Vercel y en Neon, sin depender de la zona horaria del servidor.
 */
import type { Db } from "@/lib/db/client";
import { sumarUsoIa } from "@/server/tutor/repositorio";
import { getConfigIA } from "./config";

export interface EstadoLimite {
  permitido: boolean;
  restantes: number;
}

/** Cuenta una consulta del usuario (id de la tabla usuario). Si ya ha llegado al límite, no la cuenta y devuelve permitido: false. */
export async function consumirConsulta(usuarioId: string, db?: Db): Promise<EstadoLimite> {
  const { limiteDiario } = getConfigIA();
  const total = await sumarUsoIa(usuarioId, limiteDiario, db);
  if (total === null) return { permitido: false, restantes: 0 };
  return { permitido: true, restantes: limiteDiario - total };
}
