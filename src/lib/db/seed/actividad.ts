/**
 * Siembra la ACTIVIDAD SIMULADA de la demo para el Radar del tutor (#5): `npm run db:seed:actividad`.
 *
 * - Va después del seed y del banco de ejercicios APROBADO, porque los intentos son sobre ejercicios reales.
 * - Solo toca a alumnos inventados: los 20 de ALUMNOS_SIMULADOS y los inventados del seed (emails de *.demo.test).
 *   Nunca a los de la demo en directo (src/lib/datos-prueba.ts) ni a nadie que se registre de verdad.
 * - Se puede repetir: borra la actividad anterior de esos alumnos y la vuelve a crear, en una transacción.
 */
import { and, eq, inArray, like, ne, notInArray, or } from "drizzle-orm";
import { alumnosDemo } from "../../datos-prueba";
import { ALUMNOS_SIMULADOS, construirActividad } from "../../demo/actividad";
import { CURSO_DEMO_SLUG } from "../../usuario-demo";
import type { Db } from "../client";
import { concepto, conversacion, curso, ejercicio, intento, matricula, mensaje, modulo, progreso, usuario } from "../schema";
import { seudonimoDe } from "./datos";

export interface RecuentoActividad {
  /** Alumnos inventados que han recibido actividad. */
  alumnos: number;
  intentos: number;
  mensajes: number;
  progresos: number;
  /** Conceptos del curso sin ningún ejercicio aprobado: no tienen intentos simulados. */
  conceptosSinEjercicios: string[];
}

export async function sembrarActividad(db: Db, ahora = new Date()): Promise<RecuentoActividad> {
  const [cursoDemo] = await db.select({ id: curso.id }).from(curso).where(eq(curso.slug, CURSO_DEMO_SLUG));
  if (!cursoDemo) throw new Error(`No existe el curso «${CURSO_DEMO_SLUG}». Ejecuta antes «npm run db:seed».`);

  const conceptos = await db
    .select({ id: concepto.id, slug: concepto.slug, moduloId: concepto.moduloId })
    .from(concepto)
    .innerJoin(modulo, eq(modulo.id, concepto.moduloId))
    .where(eq(modulo.cursoId, cursoDemo.id))
    .orderBy(modulo.ordenSugerido, concepto.slug);
  const moduloIds = [...new Set(conceptos.map((c) => c.moduloId))];

  const ejercicios = await db
    .select({
      id: ejercicio.id,
      conceptoId: ejercicio.conceptoId,
      tipo: ejercicio.tipo,
      opciones: ejercicio.opciones,
      solucion: ejercicio.solucion,
      claseId: ejercicio.claseId,
      segundoReferencia: ejercicio.segundoReferencia,
    })
    .from(ejercicio)
    // Los de examen no: sus respuestas van a intento_evaluacion, no a «intento» (ni al Radar).
    .where(and(inArray(ejercicio.moduloId, moduloIds), eq(ejercicio.estado, "aprobado"), ne(ejercicio.uso, "examen")))
    .orderBy(ejercicio.creado, ejercicio.id);

  return db.transaction(async (tx) => {
    // 1. Los 20 alumnos simulados, verificados y matriculados en el curso de la demo.
    await tx
      .insert(usuario)
      .values(
        ALUMNOS_SIMULADOS.map((a) => ({
          nombre: a.nombre,
          email: a.email,
          emailVerificado: true,
          rol: "alumno" as const,
          seudonimo: seudonimoDe(a.email, "alumno"),
        })),
      )
      .onConflictDoNothing({ target: usuario.email });

    // 2. Alumnos inventados: emails de prueba (*.demo.test) matriculados en el curso, menos los de la demo en directo.
    const enDirecto = alumnosDemo.map((a) => a.email.toLowerCase());
    const inventados = await tx
      .select({ usuarioId: usuario.id, email: usuario.email })
      .from(usuario)
      .where(
        and(
          eq(usuario.rol, "alumno"),
          or(like(usuario.email, "%@demo.test"), like(usuario.email, "%.demo.test")),
          notInArray(usuario.email, enDirecto),
        ),
      );
    await tx
      .insert(matricula)
      .values(inventados.map((a) => ({ cursoId: cursoDemo.id, email: a.email, usuarioId: a.usuarioId, origen: "invitacion" as const })))
      .onConflictDoNothing({ target: [matricula.cursoId, matricula.email] });

    // 3. Borra su actividad anterior en este curso y crea la nueva.
    const ids = inventados.map((a) => a.usuarioId);
    if (ids.length > 0) {
      await tx.delete(intento).where(inArray(intento.usuarioId, ids));
      await tx.delete(conversacion).where(and(inArray(conversacion.usuarioId, ids), inArray(conversacion.moduloId, moduloIds)));
      await tx.delete(progreso).where(and(inArray(progreso.usuarioId, ids), inArray(progreso.moduloId, moduloIds)));
    }

    const actividad = construirActividad({ ahora, alumnos: inventados, conceptos, ejercicios });

    if (actividad.intentos.length > 0) await tx.insert(intento).values(actividad.intentos);
    let mensajes = 0;
    for (const c of actividad.conversaciones) {
      const [{ id }] = await tx
        .insert(conversacion)
        .values({ usuarioId: c.usuarioId, moduloId: c.moduloId, creada: c.creada })
        .returning({ id: conversacion.id });
      await tx.insert(mensaje).values(c.mensajes.map((m) => ({ conversacionId: id, rol: m.rol, texto: m.texto, fecha: m.fecha })));
      mensajes += c.mensajes.length;
    }
    if (actividad.progresos.length > 0) await tx.insert(progreso).values(actividad.progresos);

    const conEjercicios = new Set(ejercicios.map((e) => e.conceptoId));
    return {
      alumnos: inventados.length,
      intentos: actividad.intentos.length,
      mensajes,
      progresos: actividad.progresos.length,
      conceptosSinEjercicios: conceptos.filter((c) => !conEjercicios.has(c.id)).map((c) => c.slug),
    };
  });
}
