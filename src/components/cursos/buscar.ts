/** Búsqueda y filtro del catálogo en el navegador (funciones puras). */

export interface CategoriaFiltro {
  slug: string;
  nombre: string;
}

export interface CursoBuscable {
  titulo: string;
  descripcion: string;
  categoria: CategoriaFiltro;
}

/** Texto comparable: sin tildes, en minúsculas y con los espacios normalizados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Cursos cuyo título, descripción o categoría contienen el texto, dentro de la categoría elegida (null = todas). */
export function filtrarCursos<T extends CursoBuscable>(
  cursos: T[],
  { texto, categoria }: { texto: string; categoria: string | null },
): T[] {
  const buscado = normalizar(texto);
  return cursos.filter(
    (c) =>
      (!categoria || c.categoria.slug === categoria) &&
      (!buscado || normalizar(`${c.titulo} ${c.descripcion} ${c.categoria.nombre}`).includes(buscado)),
  );
}

/** Categorías presentes en los cursos, sin repetir y por orden alfabético. */
export function categoriasDe(cursos: CursoBuscable[]): CategoriaFiltro[] {
  const porSlug = new Map(cursos.map((c) => [c.categoria.slug, c.categoria]));
  return [...porSlug.values()]
    .map(({ slug, nombre }) => ({ slug, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
