/**
 * Almacén del material personal de cada alumno (#2).
 * Hoy en memoria (se pierde al reiniciar el servidor), igual que el límite diario. Pasará a la BBDD con #13.
 *
 * También registra la DEMANDA de material (qué concepto y qué tipo se pide), sin el texto libre del alumno:
 * es una señal para el Radar del tutor (#5). Si muchos piden material extra de un concepto, el vídeo no se entiende bien.
 */
import type { MaterialPersonal } from "./types";

const MAXIMO_POR_ALUMNO = 20;

const porAlumno = new Map<string, MaterialPersonal[]>();
const demanda = new Map<string, number>();

export function guardarMaterialPersonal(material: MaterialPersonal): void {
  const lista = porAlumno.get(material.alumnoId) ?? [];
  lista.unshift(material);
  porAlumno.set(material.alumnoId, lista.slice(0, MAXIMO_POR_ALUMNO));

  const clave = [material.moduloId, material.conceptoId ?? "(todo)", material.tipo].join("|");
  demanda.set(clave, (demanda.get(clave) ?? 0) + 1);
}

/** Material del alumno, del más reciente al más antiguo. Opcionalmente, solo de un módulo. */
export function listarMaterialPersonal(alumnoId: string, moduloId?: string): MaterialPersonal[] {
  const lista = porAlumno.get(alumnoId) ?? [];
  return moduloId ? lista.filter((m) => m.moduloId === moduloId) : lista;
}

export interface DemandaMaterial {
  moduloId: string;
  conceptoId: string | null;
  tipo: MaterialPersonal["tipo"];
  peticiones: number;
}

/** Para el Radar (#5): qué material extra se pide más, de más a menos. */
export function demandaDeMaterial(): DemandaMaterial[] {
  return [...demanda.entries()]
    .map(([clave, peticiones]) => {
      const [moduloId, concepto, tipo] = clave.split("|");
      return { moduloId, conceptoId: concepto === "(todo)" ? null : concepto, tipo: tipo as MaterialPersonal["tipo"], peticiones };
    })
    .sort((a, b) => b.peticiones - a.peticiones);
}

/** Solo para tests. */
export function reiniciarMaterialPersonal(): void {
  porAlumno.clear();
  demanda.clear();
}
