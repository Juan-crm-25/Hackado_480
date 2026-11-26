import "server-only";
/**
 * Del catálogo de la demo (data/catalog.json) a las filas de la BBDD: el módulo y el concepto por su slug.
 * El alumno ya sale de la sesión en /api/tutor y /api/material-personal, así que la parte del puente que
 * traducía el `alumnoId` fijo ("a1") se ha quitado.
 */
import { and, eq } from "drizzle-orm";
import { getCurso } from "@/lib/catalogo";
import { getDb, type Db } from "@/lib/db/client";
import { concepto, curso, modulo } from "@/lib/db/schema";

/** Módulo del curso de la demo por su slug ("m2-css"). */
export async function buscarModulo(slug: string, db: Db = getDb()) {
  const [fila] = await db
    .select({ id: modulo.id, slug: modulo.slug })
    .from(modulo)
    .innerJoin(curso, eq(curso.id, modulo.cursoId))
    .where(and(eq(curso.slug, getCurso().id), eq(modulo.slug, slug)));
  return fila ?? null;
}

/** Concepto de ese módulo por su slug ("css-especificidad"). */
export async function buscarConcepto(moduloId: string, slug: string, db: Db = getDb()) {
  const [fila] = await db
    .select({ id: concepto.id, slug: concepto.slug })
    .from(concepto)
    .where(and(eq(concepto.moduloId, moduloId), eq(concepto.slug, slug)));
  return fila ?? null;
}
