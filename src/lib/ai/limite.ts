/**
 * Límite diario de consultas a la IA por alumno: hace el coste máximo predecible (SPEC, apartado 9).
 * Hoy se guarda en memoria (se reinicia al reiniciar el servidor). Pasará a la BBDD con #13.
 */
import { getConfigIA } from "./config";

const usos = new Map<string, { dia: string; total: number }>();

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface EstadoLimite {
  permitido: boolean;
  restantes: number;
}

/** Cuenta una consulta del alumno. Si ya ha llegado al límite, no la cuenta y devuelve permitido: false. */
export function consumirConsulta(alumnoId: string): EstadoLimite {
  const { limiteDiario } = getConfigIA();
  const dia = hoy();
  const actual = usos.get(alumnoId);
  const total = actual?.dia === dia ? actual.total : 0;

  if (total >= limiteDiario) return { permitido: false, restantes: 0 };

  usos.set(alumnoId, { dia, total: total + 1 });
  return { permitido: true, restantes: limiteDiario - total - 1 };
}

/** Solo para tests. */
export function reiniciarLimites(): void {
  usos.clear();
}
