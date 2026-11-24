import "server-only";
/**
 * PUENTE TEMPORAL — temporal hasta el login (paso 2): el usuario saldrá de la sesión.
 *
 * Las rutas /api/tutor y /api/material-personal aún reciben `alumnoId` ("a1") y `moduloId` ("m2-css").
 * Esto traduce esos ids de la demo a las filas de la BBDD: el alumno por su email en `alumnosDemo`
 * y el módulo y el concepto por su slug en el curso de data/catalog.json. Se borra cuando haya sesión.
 */
import { and, eq } from "drizzle-orm";
import { getCurso } from "@/lib/catalogo";
import { alumnosDemo } from "@/lib/datos-prueba";
import { getDb, type Db } from "@/lib/db/client";
import { concepto, curso, modulo, usuario } from "@/lib/db/schema";

/** Para el 404 cuando la BBDD está vacía. */
export const MENSAJE_SIN_SEED = "Ejecuta «npm run db:seed» para crear los datos de la demo.";

/** Usuario de la BBDD del alumno de la demo, o null si el id no es de la demo o la BBDD no tiene el seed. */
export async function buscarUsuarioDemo(alumnoId: string, db: Db = getDb()) {
  const demo = alumnosDemo.find((a) => a.id === alumnoId);
  if (!demo) return null;
  const [fila] = await db
    .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email })
    .from(usuario)
    .where(eq(usuario.email, demo.email.toLowerCase()));
  return fila ?? null;
}

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
