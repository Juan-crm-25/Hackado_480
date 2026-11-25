import "server-only";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { categoria, curso, matricula, modulo, progreso } from "@/lib/db/schema";
import { ESTADOS_COMPLETADOS } from "@/lib/progreso";

export type FilaCursoDelUsuario = {
  slug: string;
  titulo: string;
  categoria: string;
  rolEnCurso: "alumno" | "profesor";
  totalModulos: number;
  modulosCompletados: number;
  /** ¿Ha personalizado ya su ruta en este curso? */
  personalizada: boolean;
};

/**
 * Cursos en los que el usuario tiene matrícula (enlazada a su cuenta), por título, con cuántos módulos tiene
 * cada curso y cuántos ha completado. Tres consultas, sin una por curso.
 */
export async function leerCursosDelUsuario(usuarioId: string, db: Db): Promise<FilaCursoDelUsuario[]> {
  const cursos = await db
    .select({
      id: curso.id,
      slug: curso.slug,
      titulo: curso.titulo,
      categoria: categoria.nombre,
      rolEnCurso: matricula.rolEnCurso,
      personalizada: sql<boolean>`coalesce(array_length(${matricula.ordenModulos}, 1), 0) > 0`,
    })
    .from(matricula)
    .innerJoin(curso, eq(curso.id, matricula.cursoId))
    .innerJoin(categoria, eq(categoria.id, curso.categoriaId))
    .where(eq(matricula.usuarioId, usuarioId))
    .orderBy(asc(curso.titulo), asc(curso.slug));
  if (cursos.length === 0) return [];

  const ids = cursos.map((c) => c.id);
  const totales = await db
    .select({ cursoId: modulo.cursoId, total: count() })
    .from(modulo)
    .where(inArray(modulo.cursoId, ids))
    .groupBy(modulo.cursoId);
  const completados = await db
    .select({ cursoId: modulo.cursoId, total: count() })
    .from(progreso)
    .innerJoin(modulo, eq(modulo.id, progreso.moduloId))
    .where(
      and(
        eq(progreso.usuarioId, usuarioId),
        inArray(modulo.cursoId, ids),
        inArray(progreso.estado, [...ESTADOS_COMPLETADOS]),
      ),
    )
    .groupBy(modulo.cursoId);

  const totalDe = new Map(totales.map((t) => [t.cursoId, t.total]));
  const completadosDe = new Map(completados.map((c) => [c.cursoId, c.total]));
  return cursos.map(({ id, ...c }) => ({
    ...c,
    totalModulos: totalDe.get(id) ?? 0,
    modulosCompletados: completadosDe.get(id) ?? 0,
  }));
}

/** ¿Tiene el usuario una matrícula enlazada en el curso de este slug? */
export async function existeMatriculaDelUsuario(usuarioId: string, slug: string, db: Db): Promise<boolean> {
  const [fila] = await db
    .select({ id: matricula.id })
    .from(matricula)
    .innerJoin(curso, eq(curso.id, matricula.cursoId))
    .where(and(eq(matricula.usuarioId, usuarioId), eq(curso.slug, slug)))
    .limit(1);
  return fila !== undefined;
}

/** Curso por su slug (publicado o no: quien ya lo tiene sigue viéndolo), o null. */
export async function leerCursoPorSlug(slug: string, db: Db) {
  const [fila] = await db.select({ id: curso.id, slug: curso.slug, titulo: curso.titulo }).from(curso).where(eq(curso.slug, slug)).limit(1);
  return fila ?? null;
}

/** Matrícula enlazada del usuario en el curso, con su ruta personal, o null. */
export async function leerMatriculaDelUsuario(usuarioId: string, cursoId: string, db: Db) {
  const [fila] = await db
    .select({ id: matricula.id, ordenModulos: matricula.ordenModulos, moduloPrincipalId: matricula.moduloPrincipalId })
    .from(matricula)
    .where(and(eq(matricula.usuarioId, usuarioId), eq(matricula.cursoId, cursoId)))
    .limit(1);
  return fila ?? null;
}

/** Módulos del curso en el orden sugerido por el profesor. */
export async function leerModulosDelCurso(cursoId: string, db: Db) {
  return db
    .select({ uuid: modulo.id, id: modulo.slug, titulo: modulo.titulo, descripcion: modulo.descripcion, ordenSugerido: modulo.ordenSugerido })
    .from(modulo)
    .where(eq(modulo.cursoId, cursoId))
    .orderBy(asc(modulo.ordenSugerido), asc(modulo.slug));
}

/** Progreso del usuario en los módulos del curso, con el slug de cada módulo. */
export async function leerProgresoDelCurso(usuarioId: string, cursoId: string, db: Db) {
  return db
    .select({
      moduloId: modulo.slug,
      estado: progreso.estado,
      aciertosPorConcepto: progreso.aciertosPorConcepto,
      actualizado: progreso.actualizado,
    })
    .from(progreso)
    .innerJoin(modulo, eq(modulo.id, progreso.moduloId))
    .where(and(eq(progreso.usuarioId, usuarioId), eq(modulo.cursoId, cursoId)));
}

/**
 * Guarda la ruta personal en la matrícula. «Ya lo sé» solo cambia el orden: no toca el progreso
 * (un módulo solo pasa a dominado al aprobar su test).
 */
export async function guardarRutaDeMatricula(
  datos: { matriculaId: string; orden: string[]; principalId: string | null },
  db: Db,
): Promise<void> {
  await db
    .update(matricula)
    .set({ ordenModulos: datos.orden, moduloPrincipalId: datos.principalId })
    .where(eq(matricula.id, datos.matriculaId));
}
