import "server-only";
import { and, count, eq } from "drizzle-orm";
import type { EjercicioGenerado } from "@/lib/agentes/ejercicios";
import { getDb, type Db } from "@/lib/db/client";
import { clase, concepto, curso, ejercicio, modulo, plantillaEjercicio } from "@/lib/db/schema";
import type { PlantillaEjercicios } from "@/lib/types";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";

/** Plantilla del profesor de un módulo, con el id del módulo en la BBDD (para guardar sus ejercicios). */
export interface PlantillaDelModulo {
  moduloId: string;
  plantilla: PlantillaEjercicios;
}

/**
 * Plantilla de ejercicios de un módulo, buscado por su slug dentro de un curso (por defecto, el de la demo).
 * Devuelve null si el módulo no existe o no tiene plantilla.
 */
export async function leerPlantillaDelModulo(
  moduloSlug: string,
  cursoSlug: string = CURSO_DEMO_SLUG,
  db: Db = getDb(),
): Promise<PlantillaDelModulo | null> {
  const [fila] = await db
    .select({
      moduloId: modulo.id,
      tipos: plantillaEjercicio.tipos,
      ejemplos: plantillaEjercicio.ejemplos,
      indicaciones: plantillaEjercicio.indicaciones,
    })
    .from(modulo)
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .innerJoin(plantillaEjercicio, eq(plantillaEjercicio.moduloId, modulo.id))
    .where(and(eq(curso.slug, cursoSlug), eq(modulo.slug, moduloSlug)))
    .limit(1);
  if (!fila) return null;

  const plantilla: PlantillaEjercicios = { moduloId: moduloSlug, tipos: fila.tipos, ejemplos: fila.ejemplos };
  if (fila.indicaciones !== null) plantilla.indicaciones = fila.indicaciones;
  return { moduloId: fila.moduloId, plantilla };
}

/** Cuántos ejercicios tiene un módulo en cada estado. */
export async function contarEjercicios(moduloId: string, db: Db = getDb()): Promise<{ borrador: number; aprobado: number }> {
  const filas = await db
    .select({ estado: ejercicio.estado, total: count() })
    .from(ejercicio)
    .where(eq(ejercicio.moduloId, moduloId))
    .groupBy(ejercicio.estado);
  const de = (estado: string) => filas.find((f) => f.estado === estado)?.total ?? 0;
  return { borrador: de("borrador"), aprobado: de("aprobado") };
}

/**
 * Guarda los ejercicios de un módulo como borrador, en una transacción. Traduce el concepto y el vídeo de cada uno
 * (sus slugs, p. ej. "css-especificidad" y "v04") a los ids de la BBDD; si alguno no es de ese módulo, falla sin
 * guardar ninguno. Con `reemplazar`, antes borra los borradores del módulo: los aprobados no se tocan nunca.
 * Devuelve cuántos ha guardado.
 */
export async function guardarBorradores(
  moduloId: string,
  ejercicios: EjercicioGenerado[],
  opciones: { reemplazar?: boolean } = {},
  db: Db = getDb(),
): Promise<number> {
  return db.transaction(async (tx) => {
    const [conceptos, clases] = await Promise.all([
      tx.select({ id: concepto.id, slug: concepto.slug }).from(concepto).where(eq(concepto.moduloId, moduloId)),
      tx.select({ id: clase.id, slug: clase.slug }).from(clase).where(eq(clase.moduloId, moduloId)),
    ]);
    const conceptoId = new Map(conceptos.map((c) => [c.slug, c.id]));
    const claseId = new Map(clases.map((c) => [c.slug, c.id]));

    // Se resuelven todos antes de escribir nada.
    const filas = ejercicios.map((e) => {
      const idConcepto = conceptoId.get(e.conceptoId);
      if (!idConcepto) throw new Error(`El concepto "${e.conceptoId}" no es del módulo.`);
      const idClase = claseId.get(e.referencia.videoId);
      if (!idClase) throw new Error(`El vídeo "${e.referencia.videoId}" no es del módulo.`);
      return {
        moduloId,
        conceptoId: idConcepto,
        claseId: idClase,
        segundoReferencia: e.referencia.segundo,
        tipo: e.tipo,
        enunciado: e.enunciado,
        opciones: e.opciones ?? null,
        solucion: e.solucion ?? null,
        rubrica: e.rubrica ?? null,
        estado: "borrador" as const,
      };
    });

    if (opciones.reemplazar) {
      await tx.delete(ejercicio).where(and(eq(ejercicio.moduloId, moduloId), eq(ejercicio.estado, "borrador")));
    }
    if (filas.length > 0) await tx.insert(ejercicio).values(filas);
    return filas.length;
  });
}
