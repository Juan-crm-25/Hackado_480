import "server-only";
import { and, asc, desc, eq, notInArray, sql } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { clase, concepto, materialClase, materialPersonal, modulo, usuario } from "@/lib/db/schema";
import type { Infografia, MaterialPersonal, SeccionResumen, Tarjeta } from "@/lib/types";

/** Material personal que se conserva por alumno: al guardar uno nuevo se borran los más antiguos. */
export const MAXIMO_POR_ALUMNO = 20;

/** Filas a las que pertenece el material (ids de la BBDD, no los del contrato). */
export interface DestinoMaterial {
  usuarioId: string;
  moduloId: string;
  conceptoId: string | null;
}

const masReciente = [desc(materialPersonal.generado), desc(materialPersonal.id)];

/** Guarda el material de un alumno y deja solo sus MAXIMO_POR_ALUMNO más recientes, en una transacción. */
export async function guardarMaterialPersonal(material: MaterialPersonal, destino: DestinoMaterial, db: Db = getDb()): Promise<void> {
  await db.transaction(async (tx) => {
    // Bloquea al usuario: dos guardados a la vez del mismo alumno se hacen uno detrás de otro y el recorte no falla.
    await tx.select({ id: usuario.id }).from(usuario).where(eq(usuario.id, destino.usuarioId)).for("update");

    await tx.insert(materialPersonal).values({
      id: material.id,
      usuarioId: destino.usuarioId,
      moduloId: destino.moduloId,
      conceptoId: destino.conceptoId,
      tipo: material.tipo,
      nivel: material.nivel,
      enfoque: material.enfoque ?? null,
      contenido: (material.tipo === "resumen" ? material.resumen : material.tarjetas) ?? [],
      generado: new Date(material.generado),
    });

    const conservar = tx
      .select({ id: materialPersonal.id })
      .from(materialPersonal)
      .where(eq(materialPersonal.usuarioId, destino.usuarioId))
      .orderBy(...masReciente)
      .limit(MAXIMO_POR_ALUMNO);
    await tx
      .delete(materialPersonal)
      .where(and(eq(materialPersonal.usuarioId, destino.usuarioId), notInArray(materialPersonal.id, conservar)));
  });
}

/**
 * Material del alumno, del más reciente al más antiguo; opcionalmente solo de un módulo (id de la BBDD).
 * Devuelve el contrato de la API: módulo y concepto por su slug, y el alumno con el id que usa la API (`alumnoId`).
 */
export async function listarMaterialPersonal(
  filtro: { usuarioId: string; alumnoId: string; moduloId?: string },
  db: Db = getDb(),
): Promise<MaterialPersonal[]> {
  const filas = await db
    .select({
      id: materialPersonal.id,
      moduloSlug: modulo.slug,
      conceptoSlug: concepto.slug,
      tipo: materialPersonal.tipo,
      nivel: materialPersonal.nivel,
      enfoque: materialPersonal.enfoque,
      contenido: materialPersonal.contenido,
      generado: materialPersonal.generado,
    })
    .from(materialPersonal)
    .innerJoin(modulo, eq(modulo.id, materialPersonal.moduloId))
    .leftJoin(concepto, eq(concepto.id, materialPersonal.conceptoId))
    .where(
      and(
        eq(materialPersonal.usuarioId, filtro.usuarioId),
        filtro.moduloId ? eq(materialPersonal.moduloId, filtro.moduloId) : undefined,
      ),
    )
    .orderBy(...masReciente);

  return filas.map((f) => {
    const material: MaterialPersonal = {
      id: f.id,
      alumnoId: filtro.alumnoId,
      moduloId: f.moduloSlug,
      tipo: f.tipo,
      nivel: f.nivel,
      generado: f.generado.toISOString(),
    };
    if (f.conceptoSlug) material.conceptoId = f.conceptoSlug;
    if (f.enfoque) material.enfoque = f.enfoque;
    if (f.tipo === "resumen") material.resumen = f.contenido as SeccionResumen[];
    else material.tarjetas = f.contenido as Tarjeta[];
    return material;
  });
}

// ── Material común de cada clase (#15): lo genera la IA una vez por vídeo, lo revisa una persona y lo ven todos ──

/**
 * Material generado para un vídeo, con el vídeo por su slug del catálogo ("v04").
 * La infografía se guarda como lista (de una) para que el contenido tenga siempre la misma forma.
 */
export type MaterialDeClase =
  | { videoId: string; tipo: "resumen"; contenido: SeccionResumen[]; modelo: string }
  | { videoId: string; tipo: "tarjetas"; contenido: Tarjeta[]; modelo: string }
  | { videoId: string; tipo: "infografia"; contenido: Infografia[]; modelo: string };

export type TipoMaterialClase = MaterialDeClase["tipo"];

/** Lo que el alumno ve de un módulo: el material revisado de sus vídeos, juntado en el orden de los vídeos. */
export interface MaterialPublicado {
  resumen: SeccionResumen[];
  tarjetas: Tarjeta[];
  infografias: Infografia[];
}

/** Qué material tiene ya guardado cada vídeo de un módulo (id de la BBDD), para no generarlo dos veces. */
export async function materialGuardado(
  moduloId: string,
  db: Db = getDb(),
): Promise<{ videoId: string; tipo: TipoMaterialClase; revisado: boolean }[]> {
  return db
    .select({ videoId: clase.slug, tipo: materialClase.tipo, revisado: materialClase.revisado })
    .from(materialClase)
    .innerJoin(clase, eq(clase.id, materialClase.claseId))
    .where(eq(clase.moduloId, moduloId))
    .orderBy(asc(clase.orden), asc(materialClase.tipo));
}

/**
 * Guarda el material de los vídeos de un módulo (id de la BBDD) sin revisar, en una transacción.
 * Traduce cada vídeo a su clase; si alguno no es de ese módulo, falla sin guardar nada.
 * Si ya existe el de ese vídeo y tipo: sin `reemplazar` no se toca; con `reemplazar` se regenera, salvo que esté
 * revisado (lo aprobado por una persona no se pisa nunca). Devuelve cuántas filas ha escrito.
 */
export async function guardarMaterialClase(
  moduloId: string,
  materiales: MaterialDeClase[],
  opciones: { reemplazar?: boolean } = {},
  db: Db = getDb(),
): Promise<number> {
  return db.transaction(async (tx) => {
    const clases = await tx.select({ id: clase.id, slug: clase.slug }).from(clase).where(eq(clase.moduloId, moduloId));
    const claseId = new Map(clases.map((c) => [c.slug, c.id]));

    // Se resuelven todos antes de escribir nada.
    const filas = materiales.map((m) => {
      const id = claseId.get(m.videoId);
      if (!id) throw new Error(`El vídeo "${m.videoId}" no es del módulo.`);
      return { claseId: id, tipo: m.tipo, contenido: m.contenido, modelo: m.modelo, revisado: false };
    });

    let escritas = 0;
    for (const fila of filas) {
      const insertar = tx.insert(materialClase).values(fila);
      const resultado = opciones.reemplazar
        ? await insertar
            .onConflictDoUpdate({
              target: [materialClase.claseId, materialClase.tipo],
              set: { contenido: fila.contenido, modelo: fila.modelo, revisado: false, generado: sql`now()` },
              setWhere: eq(materialClase.revisado, false),
            })
            .returning({ id: materialClase.id })
        : await insertar.onConflictDoNothing().returning({ id: materialClase.id });
      escritas += resultado.length;
    }
    return escritas;
  });
}

/** El material REVISADO de los vídeos de un módulo (id de la BBDD), en orden; con `claseSlug`, solo el de ese vídeo. */
export async function leerMaterialPublicado(moduloId: string, db: Db = getDb(), claseSlug?: string): Promise<MaterialPublicado> {
  const filas = await db
    .select({ tipo: materialClase.tipo, contenido: materialClase.contenido })
    .from(materialClase)
    .innerJoin(clase, eq(clase.id, materialClase.claseId))
    .where(
      and(eq(clase.moduloId, moduloId), eq(materialClase.revisado, true), claseSlug === undefined ? undefined : eq(clase.slug, claseSlug)),
    )
    .orderBy(asc(clase.orden));

  const publicado: MaterialPublicado = { resumen: [], tarjetas: [], infografias: [] };
  for (const f of filas) {
    if (f.tipo === "resumen") publicado.resumen.push(...(f.contenido as SeccionResumen[]));
    else if (f.tipo === "tarjetas") publicado.tarjetas.push(...(f.contenido as Tarjeta[]));
    else publicado.infografias.push(...(f.contenido as Infografia[]));
  }
  return publicado;
}
