import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "../test-utils";
import { comprobarContrasena } from "../../contrasena";
import { clase, cuenta, matricula, modulo, usuario } from "../schema";
import { CONTRASENA_DEMO } from "./datos";
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
      usuario: 12,
      cuenta: 12,
      matricula: 34,
    });

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
    expect(recuento).toMatchObject({ curso: 6, modulo: 18, usuario: 12, cuenta: 12, matricula: 34, clase: 12 });
    expect(await bd.db.select().from(usuario).orderBy(usuario.email)).toEqual(antes);
    // La contraseña de una cuenta que ya existe no se vuelve a cifrar (ni se pisa si alguien la cambió).
    expect(await bd.db.select().from(cuenta).orderBy(cuenta.id)).toEqual(cuentasAntes);
  });
});
