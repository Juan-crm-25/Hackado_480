/**
 * Forma del catálogo leído de la BBDD para las pantallas (home y página del módulo).
 * Los `id` son los slugs (p. ej. "m1-html", "v01"): los mismos que usan las URLs y el contrato de la API.
 * Sin dependencias de servidor: los componentes de cliente pueden importar estos tipos.
 */

export interface ConceptoCatalogo {
  id: string;
  nombre: string;
}

export interface ClaseCatalogo {
  id: string;
  titulo: string;
  videoUrl: string;
  /** null si el enlace guardado no es de YouTube o no trae un id válido. */
  youtubeId: string | null;
  duracionSegundos: number;
}

export interface ModuloCatalogo {
  id: string;
  titulo: string;
  descripcion: string;
  ordenSugerido: number;
  conceptos: ConceptoCatalogo[];
  clases: ClaseCatalogo[];
}

export interface CursoCatalogo {
  id: string;
  titulo: string;
  descripcion: string;
  /** Nombre de la categoría: el tema principal del curso. */
  categoria: string;
  modulos: ModuloCatalogo[];
}

/** Curso tal como se lista en la home pública (solo los publicados). */
export interface CursoResumen {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: { slug: string; nombre: string };
  precioCentimos: number;
  numModulos: number;
  /** Matrículas con rol de alumno (la profesora no cuenta). */
  numAlumnos: number;
}

/** Página pública de un curso: el resumen y sus módulos en el orden sugerido. */
export interface CursoPublico extends CursoResumen {
  modulos: { id: string; titulo: string; descripcion: string; ordenSugerido: number }[];
}
