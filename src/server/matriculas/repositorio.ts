import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
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
