import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "../test-utils";
import { comprobarContrasena } from "../../contrasena";
import m2Css from "../../../../data/ejemplos-profesor/m2-css.json";
import { clase, cuenta, curso, cursoImagen, matricula, modulo, plantillaEjercicio, usuario } from "../schema";
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
      usuario: 13, // 12 de la demo + Sensei, la IA del foro
      cuenta: 12, // Sensei no tiene cuenta: no puede iniciar sesión
      matricula: 34,
      progreso: 2,
      plantilla_ejercicio: 4,
      curso_imagen: 6,
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

  it("es idempotente: repetirlo deja los mismos datos", async () => {
    const antes = await bd.db.select().from(usuario).orderBy(usuario.email);
    const cuentasAntes = await bd.db.select().from(cuenta).orderBy(cuenta.id);
    const recuento = await sembrar(bd.db);
    expect(recuento).toMatchObject({ curso: 6, modulo: 18, usuario: 13, cuenta: 12, matricula: 34, clase: 12, progreso: 2, curso_imagen: 6 });
    expect(await bd.db.select().from(usuario).orderBy(usuario.email)).toEqual(antes);
    // La contraseña de una cuenta que ya existe no se vuelve a cifrar (ni se pisa si alguien la cambió).
    expect(await bd.db.select().from(cuenta).orderBy(cuenta.id)).toEqual(cuentasAntes);
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
