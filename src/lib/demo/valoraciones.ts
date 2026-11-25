/**
 * DATOS DE DEMOSTRACIÓN del MVP: estas valoraciones y los cursos destacados son INVENTADOS
 * (./valoraciones.json), no son opiniones reales de alumnos. La interfaz los marca como «Valoraciones de ejemplo».
 * Unas valoraciones reales necesitarían su propia tabla en la BBDD (AGENTS.md, «Data rules»).
 */
import { z } from "zod";
import datos from "./valoraciones.json";

const esquemaValoracion = z.object({
  /** Nombre e inicial del apellido, p. ej. "Irene P." */
  autor: z.string().min(1),
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string(),
  /** AAAA-MM-DD */
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const esquemaValoracionesDemo = z.object({
  destacados: z.array(z.string().min(1)),
  valoraciones: z.record(z.string(), z.array(esquemaValoracion)),
});

export type Valoracion = z.infer<typeof esquemaValoracion>;

// Se valida al cargar: si alguien edita el JSON mal, falla en el test y en el build, no en pantalla.
const demo = esquemaValoracionesDemo.parse(datos);

/** Slugs de los cursos destacados en la home. */
export const cursosDestacados: readonly string[] = demo.destacados;

export function valoracionesDe(cursoSlug: string): Valoracion[] {
  return demo.valoraciones[cursoSlug] ?? [];
}

export interface ResumenValoraciones {
  /** Media con un decimal, o null si no hay valoraciones. */
  media: number | null;
  total: number;
  /** Cuántas valoraciones hay de cada número de estrellas, de 5 a 1. */
  distribucion: { estrellas: number; cantidad: number }[];
}

export function resumenValoraciones(lista: Pick<Valoracion, "estrellas">[]): ResumenValoraciones {
  const total = lista.length;
  const suma = lista.reduce((s, v) => s + v.estrellas, 0);
  return {
    media: total === 0 ? null : Math.round((suma / total) * 10) / 10,
    total,
    distribucion: [5, 4, 3, 2, 1].map((estrellas) => ({
      estrellas,
      cantidad: lista.filter((v) => v.estrellas === estrellas).length,
    })),
  };
}
