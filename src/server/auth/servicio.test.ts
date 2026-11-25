import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { cuenta, sesion, usuario } from "@/lib/db/schema";
import { CONTRASENA_DEMO } from "@/lib/db/seed/datos";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { ErrorApp } from "../compartido/errores";
import { cerrarSesion, iniciarSesion, registrar, usuarioDeToken } from "./servicio";

const hayBd = await bdPruebasDisponible();

async function errorDe(promesa: Promise<unknown>): Promise<ErrorApp> {
  try {
    await promesa;
  } catch (e) {
    if (e instanceof ErrorApp) return e;
    throw e;
  }
  throw new Error("Se esperaba un ErrorApp");
}

describe.skipIf(!hayBd)("servicio de auth (con BBDD real)", () => {
  let bd: BdPrueba;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  describe("iniciarSesion", () => {
    it("con la contraseña de demo crea una sesión que identifica al usuario", async () => {
      const { usuario: u, token, expira } = await iniciarSesion(
        { email: "lucia@demo.test", contrasena: CONTRASENA_DEMO },
        bd.db,
      );
      expect(u).toMatchObject({ nombre: "Lucía Martín", email: "lucia@demo.test", rol: "alumno", emailVerificado: true });
      expect(token.length).toBeGreaterThanOrEqual(32);
      expect(expira.getTime()).toBeGreaterThan(Date.now());

      const [fila] = await bd.db.select().from(sesion).where(eq(sesion.token, token));
      expect(fila.usuarioId).toBe(u.id);
      expect(await usuarioDeToken(token, bd.db)).toEqual(u);
    });

    it("también entran el profesor y el admin con su rol", async () => {
      const profe = await iniciarSesion({ email: "profesora@demo.test", contrasena: CONTRASENA_DEMO }, bd.db);
      const admin = await iniciarSesion({ email: "admin@demo.test", contrasena: CONTRASENA_DEMO }, bd.db);
      expect(profe.usuario.rol).toBe("profesor");
      expect(admin.usuario.rol).toBe("admin");
    });

    it("con la contraseña mal responde 401 sin decir qué falló", async () => {
      const error = await errorDe(iniciarSesion({ email: "lucia@demo.test", contrasena: "otra-cosa" }, bd.db));
      expect(error.codigo).toBe("NO_AUTENTICADO");
      expect(error.message).toBe("Email o contraseña incorrectos");
    });

    it("con un email que no existe responde el mismo 401", async () => {
      const error = await errorDe(iniciarSesion({ email: "nadie@demo.test", contrasena: CONTRASENA_DEMO }, bd.db));
      expect(error.codigo).toBe("NO_AUTENTICADO");
      expect(error.message).toBe("Email o contraseña incorrectos");
    });
  });

  describe("registrar", () => {
    it("crea un alumno verificado, su cuenta con la contraseña cifrada y una sesión", async () => {
      const { usuario: u, token } = await registrar(
        { nombre: "Nuevo Alumno", email: "nuevo@demo.test", contrasena: "segura123" },
        bd.db,
      );
      expect(u).toMatchObject({ nombre: "Nuevo Alumno", email: "nuevo@demo.test", rol: "alumno", emailVerificado: true });

      const [fila] = await bd.db.select().from(usuario).where(eq(usuario.email, "nuevo@demo.test"));
      expect(fila.seudonimo).toMatch(/^alumno_[0-9a-f]{10}$/);
      const [credencial] = await bd.db.select().from(cuenta).where(eq(cuenta.usuarioId, fila.id));
      expect(credencial.proveedor).toBe("credential");
      expect(credencial.passwordHash).not.toContain("segura123");

      expect(await usuarioDeToken(token, bd.db)).toEqual(u);
      const otraVez = await iniciarSesion({ email: "nuevo@demo.test", contrasena: "segura123" }, bd.db);
      expect(otraVez.usuario.id).toBe(u.id);
    });

    it("con un email que ya existe responde 409 y no crea nada", async () => {
      const antes = await bd.db.select().from(usuario);
      const error = await errorDe(
        registrar({ nombre: "Otra Lucía", email: "lucia@demo.test", contrasena: "segura123" }, bd.db),
      );
      expect(error.codigo).toBe("CONFLICTO");
      expect(error.message).toBe("Ya hay una cuenta con ese email");
      expect(await bd.db.select().from(usuario)).toHaveLength(antes.length);
    });
  });

  describe("usuarioDeToken y cerrarSesion", () => {
    it("un token desconocido no identifica a nadie", async () => {
      expect(await usuarioDeToken("no-existe", bd.db)).toBeNull();
    });

    it("una sesión caducada no identifica a nadie", async () => {
      const { token } = await iniciarSesion({ email: "pablo@demo.test", contrasena: CONTRASENA_DEMO }, bd.db);
      await bd.db.update(sesion).set({ expira: new Date(Date.now() - 1000) }).where(eq(sesion.token, token));
      expect(await usuarioDeToken(token, bd.db)).toBeNull();
    });

    it("cerrar sesión borra la sesión y deja de identificar al usuario", async () => {
      const { token } = await iniciarSesion({ email: "lucia@demo.test", contrasena: CONTRASENA_DEMO }, bd.db);
      await cerrarSesion(token, bd.db);
      expect(await usuarioDeToken(token, bd.db)).toBeNull();
      expect(await bd.db.select().from(sesion).where(eq(sesion.token, token))).toEqual([]);
    });
  });
});
