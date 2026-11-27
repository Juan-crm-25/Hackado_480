/**
 * Seed mínimo e idempotente: inserta o actualiza por clave natural, así que ejecutarlo dos veces deja los mismos datos.
 * Lo usa scripts/seed.ts (npm run db:seed) y los tests de integración.
 * Cada usuario tiene una cuenta de email y contraseña (CONTRASENA_DEMO) para el login simulado; no crea sesiones.
 */
import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import catalogoJson from "../../../../data/catalog.json";
import m1Html from "../../../../data/ejemplos-profesor/m1-html.json";
import m2Css from "../../../../data/ejemplos-profesor/m2-css.json";
import m3Responsive from "../../../../data/ejemplos-profesor/m3-responsive.json";
import m4Javascript from "../../../../data/ejemplos-profesor/m4-javascript.json";
import { alumnosDemo, progresoDemo } from "../../datos-prueba";
import { cifrarContrasena } from "../../contrasena";
import type { Catalogo, PlantillaEjercicios } from "../../types";
import { CURSO_DEMO_SLUG } from "../../usuario-demo";
import type { Db } from "../client";
import {
  categoria,
  clase,
  comentarioForo,
  concepto,
  cuenta,
  curso,
  cursoImagen,
  documento,
  matricula,
  modulo,
  plantillaEjercicio,
  progreso,
  puntoForo,
  temaForo,
  usuario,
} from "../schema";
import {
  BANNERS_CURSO,
  CONTRASENA_DEMO,
  USUARIO_IA_FORO,
  construirCatalogos,
  construirMatriculas,
  construirPlantillas,
  construirTranscripciones,
  construirUsuarios,
} from "./datos";
import { construirForoDemo, PROFESORA_FORO } from "./foro";

/** Ejemplos del profesor de cada módulo del curso de la demo (#12): origen de `plantilla_ejercicio`. */
const PLANTILLAS_DEMO = [m1Html, m2Css, m3Responsive, m4Javascript] as PlantillaEjercicios[];

/** En ON CONFLICT DO UPDATE: el valor que se intentaba insertar. */
const nuevo = (columna: string) => sql.raw(`excluded.${columna}`);

export type RecuentoSeed = Record<
  | "categoria"
  | "curso"
  | "modulo"
  | "concepto"
  | "clase"
  | "documento"
  | "usuario"
  | "cuenta"
  | "matricula"
  | "progreso"
  | "plantilla_ejercicio"
  | "curso_imagen"
  | "tema_foro"
  | "comentario_foro"
  | "punto_foro",
  number
>;

export async function sembrar(db: Db): Promise<RecuentoSeed> {
  const catalogos = construirCatalogos(catalogoJson as Catalogo);
  const usuarios = construirUsuarios(alumnosDemo);
  // El curso de la demo es el primero (construirCatalogos). Se construyen antes de abrir la transacción:
  // si un fichero de ejemplos está mal, el seed falla sin haber escrito nada.
  const plantillas = construirPlantillas(catalogos[0], PLANTILLAS_DEMO);
  // Las transcripciones se leen y convierten antes también: si falta un VTT, no se escribe nada.
  const transcripciones = construirTranscripciones(catalogoJson as Catalogo);
  // Se cifra una vez (fuera de la transacción): todas las cuentas del seed comparten contraseña.
  const passwordHash = await cifrarContrasena(CONTRASENA_DEMO);

  await db.transaction(async (tx) => {
    const cursoIds = new Map<string, string>();
    const moduloIds = new Map<string, string>(); // "curso/modulo" → id
    const claseIds = new Map<string, string>(); // "curso/modulo/clase" → id

    for (const catalogo of catalogos) {
      const [cat] = await tx
        .insert(categoria)
        .values(catalogo.categoria)
        .onConflictDoUpdate({ target: categoria.slug, set: { nombre: nuevo("nombre") } })
        .returning({ id: categoria.id });

      const [cur] = await tx
        .insert(curso)
        .values({ ...catalogo.curso, categoriaId: cat.id })
        .onConflictDoUpdate({
          target: curso.slug,
          set: {
            categoriaId: nuevo("categoria_id"),
            titulo: nuevo("titulo"),
            descripcion: nuevo("descripcion"),
            precioCentimos: nuevo("precio_centimos"),
            publicado: nuevo("publicado"),
          },
        })
        .returning({ id: curso.id });
      cursoIds.set(catalogo.curso.slug, cur.id);

      // Banner del curso para las tarjetas: solo la URL. Sin clave natural en la tabla, se busca antes de insertar.
      const banner = BANNERS_CURSO[catalogo.curso.slug];
      if (banner) {
        const [existe] = await tx
          .select({ id: cursoImagen.id })
          .from(cursoImagen)
          .where(and(eq(cursoImagen.cursoId, cur.id), eq(cursoImagen.uso, "banner"), eq(cursoImagen.url, banner)))
          .limit(1);
        if (!existe) {
          await tx.insert(cursoImagen).values({ cursoId: cur.id, url: banner, titulo: "Banner de la tarjeta del curso", uso: "banner" });
        }
      }

      for (const m of catalogo.modulos) {
        const [mod] = await tx
          .insert(modulo)
          .values({ cursoId: cur.id, slug: m.slug, titulo: m.titulo, descripcion: m.descripcion, ordenSugerido: m.ordenSugerido })
          .onConflictDoUpdate({
            target: [modulo.cursoId, modulo.slug],
            set: { titulo: nuevo("titulo"), descripcion: nuevo("descripcion"), ordenSugerido: nuevo("orden_sugerido") },
          })
          .returning({ id: modulo.id });
        moduloIds.set(`${catalogo.curso.slug}/${m.slug}`, mod.id);

        // Los cursos extra no tienen conceptos ni clases: un INSERT sin filas no es válido.
        if (m.conceptos.length > 0) {
          await tx
            .insert(concepto)
            .values(m.conceptos.map((c) => ({ ...c, moduloId: mod.id })))
            .onConflictDoUpdate({ target: [concepto.moduloId, concepto.slug], set: { nombre: nuevo("nombre") } });
        }

        if (m.clases.length > 0) {
          const filasClase = await tx
            .insert(clase)
            .values(m.clases.map((c) => ({ ...c, moduloId: mod.id })))
            .onConflictDoUpdate({
              target: [clase.moduloId, clase.slug],
              set: {
                titulo: nuevo("titulo"),
                videoUrl: nuevo("video_url"),
                duracionSegundos: nuevo("duracion_segundos"),
                orden: nuevo("orden"),
              },
            })
            .returning({ id: clase.id, slug: clase.slug });
          for (const c of filasClase) claseIds.set(`${catalogo.curso.slug}/${m.slug}/${c.slug}`, c.id);
        }
      }
    }

    // Transcripciones (#39): una por clase en `documento`. Se borra la de cada clase y se vuelve a insertar, así
    // repetir el seed no duplica nada y deja el texto como dice el VTT.
    if (transcripciones.length > 0) {
      const filas = transcripciones.map((t) => {
        const claseId = claseIds.get(`${catalogos[0].curso.slug}/${t.moduloSlug}/${t.claseSlug}`);
        if (!claseId) throw new Error(`La transcripción de "${t.moduloSlug}/${t.claseSlug}" no es de ninguna clase del curso.`);
        return { claseId, tipo: "transcripcion" as const, titulo: t.titulo, contenidoMd: t.contenidoMd };
      });
      await tx
        .delete(documento)
        .where(and(inArray(documento.claseId, filas.map((f) => f.claseId)), eq(documento.tipo, "transcripcion")));
      await tx.insert(documento).values(filas);
    }

    // Plantillas de ejercicios del profesor: una por módulo. Si ya existe, se deja como dice el fichero,
    // porque sin panel de administración el fichero es donde el profesor configura su módulo.
    if (plantillas.length > 0) {
      await tx
        .insert(plantillaEjercicio)
        .values(
          plantillas.map((p) => ({
            moduloId: moduloIds.get(`${p.cursoSlug}/${p.moduloSlug}`)!,
            tipos: p.tipos,
            ejemplos: p.ejemplos,
            indicaciones: p.indicaciones,
          })),
        )
        .onConflictDoUpdate({
          target: plantillaEjercicio.moduloId,
          set: { tipos: nuevo("tipos"), ejemplos: nuevo("ejemplos"), indicaciones: nuevo("indicaciones") },
        });
    }

    const filas = await tx
      .insert(usuario)
      .values(usuarios)
      .onConflictDoUpdate({
        target: usuario.email,
        set: {
          nombre: nuevo("nombre"),
          rol: nuevo("rol"),
          emailVerificado: nuevo("email_verificado"),
          esMenor: nuevo("es_menor"),
          consentimientoTutorLegal: nuevo("consentimiento_tutor_legal"),
          seudonimo: nuevo("seudonimo"),
        },
      })
      .returning({ id: usuario.id, email: usuario.email });
    const usuarioIds = new Map(filas.map((u) => [u.email, u.id]));

    // Sensei, la IA del foro: aparte de los usuarios de la demo para que no tenga cuenta ni matrículas.
    const [sensei] = await tx
      .insert(usuario)
      .values(USUARIO_IA_FORO)
      .onConflictDoUpdate({ target: usuario.email, set: { nombre: nuevo("nombre"), imagenUrl: nuevo("imagen_url") } })
      .returning({ id: usuario.id, email: usuario.email });
    usuarioIds.set(sensei.email, sensei.id);

    // Cuenta de email y contraseña para el login simulado. Si ya existe no se toca (no se pisa la contraseña).
    await tx
      .insert(cuenta)
      .values(filas.map((u) => ({ usuarioId: u.id, proveedor: "credential", idCuentaProveedor: u.id, passwordHash })))
      .onConflictDoNothing({ target: [cuenta.proveedor, cuenta.idCuentaProveedor] });

    // Por invitación y ya enlazadas (los emails están verificados). Ver construirMatriculas().
    const matriculas = construirMatriculas(catalogos, usuarios).map((m) => ({
      cursoId: cursoIds.get(m.cursoSlug)!,
      email: m.email,
      usuarioId: usuarioIds.get(m.email)!,
      rolEnCurso: m.rolEnCurso,
      origen: "invitacion" as const,
    }));
    // Progreso de demostración (src/lib/datos-prueba.ts) en el curso de la demo, para que «Tus cursos» no salga al 0 %.
    // Si ya hay progreso de ese módulo no se toca: puede ser progreso real del alumno.
    const emailDe = new Map(alumnosDemo.map((a) => [a.id, a.email.toLowerCase()]));
    const progresos = progresoDemo.map((p) => ({
      usuarioId: usuarioIds.get(emailDe.get(p.alumnoId)!)!,
      moduloId: moduloIds.get(`${CURSO_DEMO_SLUG}/${p.moduloId}`)!,
      estado: p.estado,
      aciertosPorConcepto: p.aciertosPorConcepto,
    }));
    if (progresos.length > 0) {
      await tx.insert(progreso).values(progresos).onConflictDoNothing({ target: [progreso.usuarioId, progreso.moduloId] });
    }

    // Si ya existía (p. ej., de una compra), solo se enlaza y se fija el rol: el origen y el pedido no se tocan.
    await tx
      .insert(matricula)
      .values(matriculas)
      .onConflictDoUpdate({
        target: [matricula.cursoId, matricula.email],
        set: { usuarioId: nuevo("usuario_id"), rolEnCurso: nuevo("rol_en_curso") },
      });

    // Foro de la demo (src/lib/db/seed/foro.ts). Sin clave natural: un tema se reconoce por (módulo, título).
    // Si ya existe no se toca, ni sus comentarios ni sus puntos: pueden tener respuestas reales de la demo.
    const idDe = (email: string) => usuarioIds.get(email)!;
    for (const t of construirForoDemo()) {
      const moduloId = moduloIds.get(`${CURSO_DEMO_SLUG}/${t.moduloSlug}`)!;
      const [existe] = await tx
        .select({ id: temaForo.id })
        .from(temaForo)
        .where(and(eq(temaForo.moduloId, moduloId), eq(temaForo.titulo, t.titulo)))
        .limit(1);
      if (existe) continue;

      const autorTema = idDe(t.autor);
      const [tema] = await tx
        .insert(temaForo)
        .values({ moduloId, autorId: autorTema, titulo: t.titulo, cuerpo: t.cuerpo, creado: t.creado, actualizado: t.creado })
        .returning({ id: temaForo.id });
      if (t.puntosProfesor) {
        await tx.insert(puntoForo).values({ profesorId: idDe(PROFESORA_FORO), alumnoId: autorTema, temaId: tema.id, creado: t.creado, ...t.puntosProfesor });
      }

      // Uno a uno y en orden: la respuesta de Sensei necesita el id del comentario al que contesta.
      const comentarioIds = new Map<string, string>();
      for (const c of t.comentarios) {
        const [fila] = await tx
          .insert(comentarioForo)
          .values({
            temaId: tema.id,
            autorId: idDe(c.autor),
            respuestaAId: c.respuestaA ? comentarioIds.get(c.respuestaA)! : null,
            cuerpo: c.cuerpo,
            validacion: c.validacion,
            validadoPor: c.validadoPor ?? null,
            profesorId: c.profesor ? idDe(c.profesor) : null,
            validadoEn: c.validadoEn ?? null,
            creado: c.creado,
          })
          .returning({ id: comentarioForo.id });
        comentarioIds.set(c.clave, fila.id);
        if (c.puntosProfesor) {
          await tx.insert(puntoForo).values({ profesorId: idDe(PROFESORA_FORO), alumnoId: idDe(c.autor), comentarioId: fila.id, creado: c.creado, ...c.puntosProfesor });
        }
      }
    }
  });

  const contar = async (tabla: PgTable) => {
    const [{ total }] = await db.select({ total: count() }).from(tabla);
    return total;
  };
  return {
    categoria: await contar(categoria),
    curso: await contar(curso),
    modulo: await contar(modulo),
    concepto: await contar(concepto),
    clase: await contar(clase),
    documento: await contar(documento),
    usuario: await contar(usuario),
    cuenta: await contar(cuenta),
    matricula: await contar(matricula),
    progreso: await contar(progreso),
    plantilla_ejercicio: await contar(plantillaEjercicio),
    curso_imagen: await contar(cursoImagen),
    tema_foro: await contar(temaForo),
    comentario_foro: await contar(comentarioForo),
    punto_foro: await contar(puntoForo),
  };
}
