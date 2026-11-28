import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "../test-utils";
import { comprobarContrasena } from "../../contrasena";
import m2Css from "../../../../data/ejemplos-profesor/m2-css.json";
import { FRASES_SENSEI } from "../../foro";
import { clase, comentarioForo, cuenta, curso, cursoImagen, documento, matricula, modulo, plantillaEjercicio, puntoForo, temaForo, usuario } from "../schema";
import { parsearMarkdown } from "../../transcripciones";
import { CONTRASENA_DEMO, EMAIL_IA_FORO } from "./datos";
import { sembrar } from "./sembrar";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("sembrar (con BBDD real)", () => {
  let bd: BdPrueba;
  beforeAll(async () => {
    bd = await crearBdPrueba();
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  it("crea el curso, los usuarios y sus matrículas", async () => {
    const recuento = await sembrar(bd.db);
    expect(recuento).toEqual({
      categoria: 5,
      curso: 6,
      modulo: 18,
      concepto: 12,
      clase: 12,
      documento: 12, // la transcripción de cada vídeo (#39)
      usuario: 13, // 12 de la demo + Sensei, la IA del foro
      cuenta: 12, // Sensei no tiene cuenta: no puede iniciar sesión
      matricula: 34,
      progreso: 3, // Lucía: HTML completado, CSS en curso y Maquetación dominado
      plantilla_ejercicio: 4,
      curso_imagen: 6,
      tema_foro: 6,
      comentario_foro: 26,
      punto_foro: 2,
    });

    const [banner] = await bd.db
      .select({ url: cursoImagen.url, uso: cursoImagen.uso })
      .from(cursoImagen)
      .innerJoin(curso, eq(curso.id, cursoImagen.cursoId))
      .where(eq(curso.slug, "desarrollo-web"));
    expect(banner).toEqual({ url: "/banners/desarrollo-web.webp", uso: "banner" });

    // Sensei, la IA del foro (H10): un usuario con avatar, sin cuenta ni matrículas.
    const [sensei] = await bd.db.select().from(usuario).where(eq(usuario.email, EMAIL_IA_FORO));
    expect(sensei).toMatchObject({ nombre: "Sensei", imagenUrl: "/avatars/sensei.svg", emailVerificado: true });
    expect(await bd.db.select().from(cuenta).where(eq(cuenta.usuarioId, sensei.id))).toEqual([]);
    expect(await bd.db.select().from(matricula).where(eq(matricula.email, EMAIL_IA_FORO))).toEqual([]);

    const lucia = await bd.db.query.usuario.findFirst({ where: eq(usuario.email, "lucia@demo.test") });
    expect(lucia).toMatchObject({ nombre: "Lucía Martín", rol: "alumno", emailVerificado: true });
    const [credencial] = await bd.db.select().from(cuenta).where(eq(cuenta.usuarioId, lucia!.id));
    expect(credencial).toMatchObject({ proveedor: "credential", idCuentaProveedor: lucia!.id });
    expect(await comprobarContrasena(CONTRASENA_DEMO, credencial.passwordHash)).toBe(true);

    const matriculas = await bd.db.select().from(matricula);
    expect(matriculas.every((m) => m.usuarioId !== null && m.origen === "invitacion" && m.pedidoId === null)).toBe(true);
    expect(matriculas.filter((m) => m.rolEnCurso === "profesor").map((m) => m.email)).toEqual(["profesora@demo.test"]);

    const [v04] = await bd.db.select().from(clase).where(eq(clase.slug, "v04"));
    const [css] = await bd.db.select().from(modulo).where(eq(modulo.id, v04.moduloId));
    expect(css.slug).toBe("m2-css");
    expect(v04).toMatchObject({ videoUrl: "https://www.youtube.com/watch?v=6fh7ZTj2t2k", orden: 1 });
  });

  it("guarda la transcripción de cada vídeo en documento, con marcas [mm:ss] que se pueden volver a leer (#39)", async () => {
    const filas = await bd.db
      .select({ slug: clase.slug, tipo: documento.tipo, titulo: documento.titulo, md: documento.contenidoMd })
      .from(documento)
      .innerJoin(clase, eq(clase.id, documento.claseId))
      .orderBy(asc(clase.slug));
    expect(filas.map((f) => f.slug)).toEqual(Array.from({ length: 12 }, (_, i) => `v${String(i + 1).padStart(2, "0")}`));
    expect(filas.every((f) => f.tipo === "transcripcion")).toBe(true);
    const v04 = filas.find((f) => f.slug === "v04")!;
    expect(v04.md.startsWith("## Vídeo v04: ")).toBe(true);
    const fragmentos = parsearMarkdown(v04.md);
    expect(fragmentos.length).toBeGreaterThan(5);
    expect(fragmentos.every((f, i) => i === 0 || f.inicio > fragmentos[i - 1].inicio)).toBe(true);
  });

  it("es idempotente: repetirlo deja los mismos datos", async () => {
    const antes = await bd.db.select().from(usuario).orderBy(usuario.email);
    const cuentasAntes = await bd.db.select().from(cuenta).orderBy(cuenta.id);
    const comentariosAntes = await bd.db.select().from(comentarioForo).orderBy(comentarioForo.id);
    const recuento = await sembrar(bd.db);
    expect(recuento).toMatchObject({ curso: 6, modulo: 18, usuario: 13, cuenta: 12, matricula: 34, clase: 12, documento: 12, progreso: 3, curso_imagen: 6 });
    // El foro no se duplica: un tema que ya existe (mismo módulo y título) no vuelve a crear sus comentarios ni sus puntos.
    expect(recuento).toMatchObject({ tema_foro: 6, comentario_foro: 26, punto_foro: 2 });
    expect(await bd.db.select().from(comentarioForo).orderBy(comentarioForo.id)).toEqual(comentariosAntes);
    expect(await bd.db.select().from(usuario).orderBy(usuario.email)).toEqual(antes);
    // La contraseña de una cuenta que ya existe no se vuelve a cifrar (ni se pisa si alguien la cambió).
    expect(await bd.db.select().from(cuenta).orderBy(cuenta.id)).toEqual(cuentasAntes);
  });

  it("siembra el foro de la demo: dudas respondidas y valoradas, respuestas de Sensei, puntos del profesor y dudas sin responder", async () => {
    const usuarios = await bd.db.select({ id: usuario.id, email: usuario.email }).from(usuario);
    const idDe = (email: string) => usuarios.find((u) => u.email === email)!.id;
    const temas = await bd.db
      .select({ id: temaForo.id, titulo: temaForo.titulo, modulo: modulo.slug })
      .from(temaForo)
      .innerJoin(modulo, eq(modulo.id, temaForo.moduloId));
    const comentarios = await bd.db.select().from(comentarioForo).orderBy(asc(comentarioForo.creado));
    const porId = new Map(comentarios.map((c) => [c.id, c]));

    // Los cuatro módulos del curso de la demo tienen foro.
    expect(new Set(temas.map((t) => t.modulo))).toEqual(new Set(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]));

    // Al menos dos dudas sin responder, para la demo en directo; una de especificidad en CSS.
    const sinComentarios = temas.filter((t) => !comentarios.some((c) => c.temaId === t.id));
    expect(sinComentarios.length).toBeGreaterThanOrEqual(2);
    expect(sinComentarios.some((t) => t.modulo === "m2-css")).toBe(true);

    // Lucía y Pablo quedan libres para la demo: no escriben comentarios.
    expect(comentarios.filter((c) => [idDe("lucia@demo.test"), idDe("pablo@demo.test")].includes(c.autorId))).toEqual([]);

    // Sensei contesta a cada respuesta que valoró la IA, con su frase, y deja su comentario pendiente.
    const sensei = idDe(EMAIL_IA_FORO);
    const deSensei = comentarios.filter((c) => c.autorId === sensei);
    expect(deSensei.length).toBeGreaterThan(0);
    for (const c of deSensei) {
      const respondido = porId.get(c.respuestaAId!)!;
      expect(respondido).toMatchObject({ validadoPor: "ia" });
      expect(["correcta", "aproximada", "incorrecta"]).toContain(respondido.validacion);
      expect(c.cuerpo).toBe(FRASES_SENSEI[respondido.validacion as keyof typeof FRASES_SENSEI]);
      expect(c).toMatchObject({ validacion: "pendiente", validadoPor: null, validadoEn: null });
    }
    const valoradasPorIa = comentarios.filter((c) => c.validadoPor === "ia" && c.validacion !== "no_respuesta");
    expect(new Set(valoradasPorIa.map((c) => c.validacion))).toEqual(new Set(["correcta", "aproximada", "incorrecta"]));
    expect(valoradasPorIa.every((c) => deSensei.some((s) => s.respuestaAId === c.id))).toBe(true);

    // Un «¡Gracias!» no es una respuesta: no_respuesta y Sensei no contesta.
    const noRespuestas = comentarios.filter((c) => c.validacion === "no_respuesta");
    expect(noRespuestas.length).toBeGreaterThan(0);
    expect(noRespuestas.every((c) => !deSensei.some((s) => s.respuestaAId === c.id))).toBe(true);

    // La profesora comenta (sin valorar) y corrige una valoración.
    const profesora = idDe("profesora@demo.test");
    expect(comentarios.some((c) => c.autorId === profesora && c.validacion === "pendiente")).toBe(true);
    expect(comentarios.filter((c) => c.validadoPor === "profesor")).toEqual([expect.objectContaining({ profesorId: profesora })]);

    // Un tema con 5 respuestas correctas de 4 personas: muestra que solo puntúan las 3 primeras personas distintas.
    const correctasPorTema = Map.groupBy(
      comentarios.filter((c) => c.validacion === "correcta" && c.autorId !== sensei),
      (c) => c.temaId,
    );
    expect([...correctasPorTema.values()].some((cs) => cs.length >= 5 && new Set(cs.map((c) => c.autorId)).size === 4)).toBe(true);

    // Puntos del profesor: +3 a una buena pregunta y +1 a la buena conducta de un comentario.
    const puntos = await bd.db.select().from(puntoForo);
    expect(puntos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ profesorId: profesora, comentarioId: null, puntos: 3, motivo: "buena_pregunta" }),
        expect.objectContaining({ profesorId: profesora, temaId: null, puntos: 1, motivo: "buena_conducta" }),
      ]),
    );
  });

  it("guarda la plantilla de ejercicios de cada módulo de la demo, enlazada a su módulo", async () => {
    const filas = await bd.db
      .select({ modulo: modulo.slug, tipos: plantillaEjercicio.tipos, ejemplos: plantillaEjercicio.ejemplos, indicaciones: plantillaEjercicio.indicaciones })
      .from(plantillaEjercicio)
      .innerJoin(modulo, eq(plantillaEjercicio.moduloId, modulo.id))
      .orderBy(modulo.slug);
    expect(filas.map((f) => f.modulo)).toEqual(["m1-html", "m2-css", "m3-responsive", "m4-javascript"]);
    expect(filas[1]).toEqual({ modulo: "m2-css", tipos: m2Css.tipos, ejemplos: m2Css.ejemplos, indicaciones: m2Css.indicaciones });
  });

  it("si la plantilla ya existe, la deja como dice el fichero (el fichero es donde la configura el profesor)", async () => {
    const [css] = await bd.db.select().from(modulo).where(eq(modulo.slug, "m2-css"));
    await bd.db
      .update(plantillaEjercicio)
      .set({ tipos: ["test"], ejemplos: [], indicaciones: "versión antigua" })
      .where(eq(plantillaEjercicio.moduloId, css.id));

    const recuento = await sembrar(bd.db);
    expect(recuento.plantilla_ejercicio).toBe(4);
    const [plantilla] = await bd.db.select().from(plantillaEjercicio).where(eq(plantillaEjercicio.moduloId, css.id));
    expect(plantilla).toMatchObject({ tipos: m2Css.tipos, ejemplos: m2Css.ejemplos, indicaciones: m2Css.indicaciones });
  });
});
