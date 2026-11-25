/**
 * DATOS DE DEMOSTRACIÓN del MVP: anuncios de la home pública, escritos a mano (no salen de la BBDD).
 * Ver AGENTS.md, «Data rules»: src/lib/demo/ es contenido de ejemplo fijo.
 */
export interface Anuncio {
  id: string;
  titulo: string;
  texto: string;
  /** Texto del botón o enlace. */
  cta: string;
  /** Enlace interno: un curso (/cursos/<slug>) o la home. */
  href: string;
  /** Fechas de validez orientativas (AAAA-MM-DD). */
  desde?: string;
  hasta?: string;
}

export const anuncios: Anuncio[] = [
  {
    id: "cyber-monday",
    titulo: "Cyber Monday: −30 % en Python",
    texto: "Solo este lunes, empieza a programar desde cero con un 30 % de descuento.",
    cta: "Ver el curso de Python",
    href: "/cursos/python-desde-cero",
    desde: "2026-11-30",
    hasta: "2026-11-30",
  },
  {
    id: "navidad",
    titulo: "Navidad: regala aprendizaje",
    texto: "Prepara las fiestas con nuestro curso de cocina mediterránea saludable.",
    cta: "Ver el curso de cocina",
    href: "/cursos/cocina-mediterranea-saludable",
    desde: "2026-12-01",
    hasta: "2027-01-06",
  },
];
