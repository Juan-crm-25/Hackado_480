/**
 * Ruta personalizada (cursos no lineales): el alumno valora cada módulo y unas reglas sencillas
 * ordenan el curso. Sin IA: la recomendación del tutor sale de plantillas. Funciones puras.
 */

export type Valoracion = "mucho" | "interesa" | "sabe";

/** Opciones que ve el alumno en cada módulo, en orden. «Me interesa» es la de por defecto. */
export const VALORACIONES = [
  { id: "mucho", texto: "Me interesa mucho" },
  { id: "interesa", texto: "Me interesa" },
  { id: "sabe", texto: "Ya lo sé" },
] as const satisfies readonly { id: Valoracion; texto: string }[];

export const VALORACION_POR_DEFECTO: Valoracion = "interesa";

const PRIORIDAD: Record<Valoracion, number> = { mucho: 0, interesa: 1, sabe: 2 };

type ModuloOrdenable = { id: string; ordenSugerido: number };

/** Valoración del módulo; sin valorar, «Me interesa». Solo propiedades propias (un slug «constructor» no rompe nada). */
const valoracionDe = (valoraciones: Partial<Record<string, Valoracion>>, id: string): Valoracion =>
  (Object.hasOwn(valoraciones, id) ? valoraciones[id] : undefined) ?? VALORACION_POR_DEFECTO;

/**
 * Ordena los módulos: primero «Me interesa mucho», después «Me interesa» y al final «Ya lo sé».
 * Los empates siguen el orden sugerido del profesor. El principal es el primero que no sabe ya;
 * si lo sabe todo, el orden es el del profesor y el principal, el primero.
 */
export function ordenarRuta<M extends ModuloOrdenable>(
  modulos: M[],
  valoraciones: Partial<Record<string, Valoracion>>,
): { orden: M[]; principal: M | null } {
  const orden = [...modulos].sort(
    (a, b) =>
      PRIORIDAD[valoracionDe(valoraciones, a.id)] - PRIORIDAD[valoracionDe(valoraciones, b.id)] ||
      a.ordenSugerido - b.ordenSugerido ||
      a.id.localeCompare(b.id),
  );
  const principal = orden.find((m) => valoracionDe(valoraciones, m.id) !== "sabe") ?? orden[0] ?? null;
  return { orden, principal };
}

/**
 * Los módulos en el orden de la ruta guardada. Sin ruta, el orden de siempre. Los módulos que no están en
 * la ruta (añadidos después) van al final en su orden, y los ids que ya no existen se ignoran.
 */
export function aplicarOrden<M extends { id: string }>(modulos: M[], orden: string[] | null | undefined): M[] {
  if (!orden || orden.length === 0) return modulos;
  const posicion = new Map(orden.map((id, i) => [id, i]));
  const enRuta = modulos.filter((m) => posicion.has(m.id)).sort((a, b) => posicion.get(a.id)! - posicion.get(b.id)!);
  return [...enRuta, ...modulos.filter((m) => !posicion.has(m.id))];
}

/** «A», «A» y «B», «A», «B» y «C». */
function lista(titulos: string[]): string {
  const citados = titulos.map((t) => `«${t}»`);
  return citados.length <= 1 ? (citados[0] ?? "") : `${citados.slice(0, -1).join(", ")} y ${citados.at(-1)}`;
}

/** La recomendación del tutor, frase a frase, a partir de la ruta ya ordenada. */
export function recomendacionTutor(
  orden: { id: string; titulo: string }[],
  valoraciones: Partial<Record<string, Valoracion>>,
): string[] {
  if (orden.length === 0) return [];
  const de = (v: Valoracion) => orden.filter((m) => valoracionDe(valoraciones, m.id) === v);
  const sabe = de("sabe");

  if (sabe.length === orden.length) {
    return [
      "Parece que ya conoces todo el curso. Te propongo repasarlo en su orden original y hacer el test de cada módulo para marcarlo como dominado.",
      "Nada queda bloqueado: puedes abrir cualquier módulo cuando quieras.",
    ];
  }

  const [primero, ...otrosMucho] = de("mucho");
  const frases = primero
    ? [`Empezamos por «${primero.titulo}» porque es lo que más te interesa.`]
    : [`Empezamos por «${orden[0].titulo}»: es el primer módulo de tu ruta.`];

  if (otrosMucho.length > 0) {
    const varios = otrosMucho.length > 1;
    frases.push(
      `Después seguimos con ${lista(otrosMucho.map((m) => m.titulo))}, que también te ${varios ? "interesan" : "interesa"} mucho.`,
    );
  }
  if (sabe.length > 0) {
    const varios = sabe.length > 1;
    frases.push(
      `${lista(sabe.map((m) => m.titulo))} ${varios ? "los" : "lo"} dejamos para el final porque ya ${varios ? "los" : "lo"} conoces. ` +
        `Cuando quieras, haz su test para marcar${varios ? "los como dominados" : "lo como dominado"}.`,
    );
  }
  frases.push("Nada queda bloqueado: puedes abrir cualquier módulo cuando quieras.");
  return frases;
}

// ─── Respuestas de /api/cursos/:slug/ruta (compartidas por la API y las pantallas) ─────────

export type ModuloDeRuta = { id: string; titulo: string; descripcion: string };

/** GET: los módulos del curso (en el orden del profesor, para valorarlos) y la ruta del alumno si ya la hizo. */
export type RutaDelCurso = {
  curso: { slug: string; titulo: string };
  personalizada: boolean;
  /** Slugs de los módulos en el orden de la ruta del alumno, o null si aún no la ha hecho. */
  orden: string[] | null;
  /** Slug del módulo principal de la ruta, o null si aún no la ha hecho. */
  principal: string | null;
  modulos: ModuloDeRuta[];
};

/** PUT: la ruta nueva con la valoración de cada módulo y la recomendación del tutor. */
export type RespuestaRuta = {
  curso: { slug: string; titulo: string };
  principal: string | null;
  modulos: (ModuloDeRuta & { valoracion: Valoracion })[];
  recomendacion: string[];
};
