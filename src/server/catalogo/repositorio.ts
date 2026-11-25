import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { ClaseCatalogo, ConceptoCatalogo, CursoCatalogo, CursoPublico, CursoResumen } from "@/lib/catalogo-bd";
import { getDb, type Db } from "@/lib/db/client";
import { categoria, clase, concepto, curso, matricula, modulo } from "@/lib/db/schema";
import { CURSO_DEMO_SLUG } from "@/lib/usuario-demo";
import { idDeYoutube } from "@/lib/youtube";

/** Agrupa filas por la columna `moduloId` conservando el orden en que llegan. */
function porModulo<T extends { moduloId: string }, R>(filas: T[], mapear: (f: T) => R): Map<string, R[]> {
  const grupos = new Map<string, R[]>();
  for (const f of filas) grupos.set(f.moduloId, [...(grupos.get(f.moduloId) ?? []), mapear(f)]);
  return grupos;
}

/**
 * Curso principal con su categoría, sus módulos en el orden sugerido y, en cada módulo, sus conceptos
 * y sus clases en orden. Es el curso del usuario de demostración (CURSO_DEMO_SLUG); si no existe, el primero
 * publicado (o el primero creado). Devuelve null si no hay ningún curso.
 */
export async function leerCursoPrincipal(db: Db = getDb(), slug: string = CURSO_DEMO_SLUG): Promise<CursoCatalogo | null> {
  const consulta = () =>
    db
      .select({
        id: curso.id,
        slug: curso.slug,
        titulo: curso.titulo,
        descripcion: curso.descripcion,
        categoria: categoria.nombre,
      })
      .from(curso)
      .innerJoin(categoria, eq(categoria.id, curso.categoriaId));
  const [elegido] = await consulta().where(eq(curso.slug, slug)).limit(1);
  const [fila] = elegido
    ? [elegido]
    : await consulta().orderBy(desc(curso.publicado), asc(curso.creado), asc(curso.slug)).limit(1);
  if (!fila) return null;

  const modulos = await db
    .select()
    .from(modulo)
    .where(eq(modulo.cursoId, fila.id))
    .orderBy(asc(modulo.ordenSugerido), asc(modulo.slug));
  const ids = modulos.map((m) => m.id);

  const [conceptos, clases] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          db.select().from(concepto).where(inArray(concepto.moduloId, ids)).orderBy(asc(concepto.slug)),
          db.select().from(clase).where(inArray(clase.moduloId, ids)).orderBy(asc(clase.orden), asc(clase.slug)),
        ]);

  const conceptosPorModulo = porModulo(conceptos, (c): ConceptoCatalogo => ({ id: c.slug, nombre: c.nombre }));
  const clasesPorModulo = porModulo(
    clases,
    (c): ClaseCatalogo => ({
      id: c.slug,
      titulo: c.titulo,
      videoUrl: c.videoUrl,
      youtubeId: idDeYoutube(c.videoUrl),
      duracionSegundos: c.duracionSegundos,
    }),
  );

  return {
    id: fila.slug,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    modulos: modulos.map((m) => ({
      id: m.slug,
      titulo: m.titulo,
      descripcion: m.descripcion,
      ordenSugerido: m.ordenSugerido,
      conceptos: conceptosPorModulo.get(m.id) ?? [],
      clases: clasesPorModulo.get(m.id) ?? [],
    })),
  };
}

/** Columnas del resumen de un curso. Los recuentos son subconsultas en la misma consulta (sin N+1). */
const columnasResumen = {
  slug: curso.slug,
  titulo: curso.titulo,
  descripcion: curso.descripcion,
  categoriaSlug: categoria.slug,
  categoriaNombre: categoria.nombre,
  precioCentimos: curso.precioCentimos,
  numModulos: sql<number>`(select count(*) from ${modulo} where ${modulo.cursoId} = ${curso.id})`.mapWith(Number),
  numAlumnos: sql<number>`(select count(*) from ${matricula} where ${matricula.cursoId} = ${curso.id} and ${matricula.rolEnCurso} = 'alumno')`.mapWith(
    Number,
  ),
};

interface FilaResumen {
  slug: string;
  titulo: string;
  descripcion: string;
  categoriaSlug: string;
  categoriaNombre: string;
  precioCentimos: number;
  numModulos: number;
  numAlumnos: number;
}

function aResumen(f: FilaResumen): CursoResumen {
  return {
    slug: f.slug,
    titulo: f.titulo,
    descripcion: f.descripcion,
    categoria: { slug: f.categoriaSlug, nombre: f.categoriaNombre },
    precioCentimos: f.precioCentimos,
    numModulos: f.numModulos,
    numAlumnos: f.numAlumnos,
  };
}

/** Cursos publicados para la home pública, en orden alfabético. Una sola consulta. */
export async function leerCursosPublicados(db: Db = getDb()): Promise<CursoResumen[]> {
  const filas = await db
    .select(columnasResumen)
    .from(curso)
    .innerJoin(categoria, eq(categoria.id, curso.categoriaId))
    .where(eq(curso.publicado, true))
    .orderBy(asc(curso.titulo), asc(curso.slug));
  return filas.map(aResumen);
}

/** Un curso publicado por su slug, con sus módulos en el orden sugerido; null si no existe o no está publicado. */
export async function leerCursoPublicado(slug: string, db: Db = getDb()): Promise<CursoPublico | null> {
  const [fila] = await db
    .select({ id: curso.id, ...columnasResumen })
    .from(curso)
    .innerJoin(categoria, eq(categoria.id, curso.categoriaId))
    .where(and(eq(curso.slug, slug), eq(curso.publicado, true)))
    .limit(1);
  if (!fila) return null;

  const modulos = await db
    .select({ id: modulo.slug, titulo: modulo.titulo, descripcion: modulo.descripcion, ordenSugerido: modulo.ordenSugerido })
    .from(modulo)
    .where(eq(modulo.cursoId, fila.id))
    .orderBy(asc(modulo.ordenSugerido), asc(modulo.slug));

  return { ...aResumen(fila), modulos };
}
