import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { concepto, conversacion, ejercicio, intento, matricula, mensaje, modulo, usuario } from "@/lib/db/schema";
import type { DatosRadar } from "./calculo";

/**
 * Lee lo que necesita el Radar de un curso: sus módulos, sus alumnos (no los profesores),
 * los intentos y las preguntas al tutor desde `desde`. Los textos de las dudas ya se guardaron filtrados.
 */
export async function leerDatosRadar(
  cursoId: string,
  desde: Date,
  db: Db,
): Promise<Omit<DatosRadar, "curso">> {
  const modulos = await db
    .select({ slug: modulo.slug, titulo: modulo.titulo })
    .from(modulo)
    .where(eq(modulo.cursoId, cursoId))
    .orderBy(asc(modulo.ordenSugerido));

  const alumnos = await db
    .select({ usuarioId: usuario.id, nombre: usuario.nombre })
    .from(matricula)
    .innerJoin(usuario, eq(usuario.id, matricula.usuarioId))
    .where(and(eq(matricula.cursoId, cursoId), eq(matricula.rolEnCurso, "alumno")));

  const intentos = await db
    .select({
      usuarioId: intento.usuarioId,
      conceptoSlug: concepto.slug,
      concepto: concepto.nombre,
      moduloSlug: modulo.slug,
      correcto: intento.correcto,
      fecha: intento.fecha,
    })
    .from(intento)
    .innerJoin(ejercicio, eq(ejercicio.id, intento.ejercicioId))
    .innerJoin(concepto, eq(concepto.id, ejercicio.conceptoId))
    .innerJoin(modulo, eq(modulo.id, ejercicio.moduloId))
    .where(and(eq(modulo.cursoId, cursoId), gte(intento.fecha, desde)));

  const dudas = await db
    .select({ usuarioId: conversacion.usuarioId, moduloSlug: modulo.slug, texto: mensaje.texto, fecha: mensaje.fecha })
    .from(mensaje)
    .innerJoin(conversacion, eq(conversacion.id, mensaje.conversacionId))
    .innerJoin(modulo, eq(modulo.id, conversacion.moduloId))
    .where(and(eq(modulo.cursoId, cursoId), eq(mensaje.rol, "alumno"), gte(mensaje.fecha, desde)));

  return { modulos, alumnos, intentos, dudas };
}
