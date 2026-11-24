import "server-only";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { concepto, materialPersonal, modulo, usuario } from "@/lib/db/schema";
import type { MaterialPersonal, SeccionResumen, Tarjeta } from "@/lib/types";

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
