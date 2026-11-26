import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { conversacion, mensaje, modulo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { guardarIntercambio, listarMensajes } from "./repositorio";
import { registrarIntercambio } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("conversaciones del tutor (con BBDD real)", () => {
  let bd: BdPrueba;
  let lucia: string;
  let pablo: string;
  let css: string;
  let html: string;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    const idUsuario = async (email: string) => (await bd.db.select().from(usuario).where(eq(usuario.email, email)))[0].id;
    const idModulo = async (slug: string) => (await bd.db.select().from(modulo).where(eq(modulo.slug, slug)))[0].id;
    lucia = await idUsuario("lucia@demo.test");
    pablo = await idUsuario("pablo@demo.test");
    css = await idModulo("m2-css");
    html = await idModulo("m1-html");
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(conversacion);
  });

  const respuesta = { texto: "Gana el id", fuentes: [{ videoId: "v04", segundo: 125 }] };

  describe("guardarIntercambio", () => {
    it("guarda la pregunta y la respuesta, en orden, en una conversación del alumno y el módulo", async () => {
      const { conversacionId } = await guardarIntercambio(
        { usuarioId: lucia, moduloId: css, pregunta: "¿Por qué gana #enviar?", respuesta },
        bd.db,
      );

      const mensajes = await listarMensajes(conversacionId, bd.db);
      expect(mensajes.map(({ rol, texto, fuentes }) => ({ rol, texto, fuentes }))).toEqual([
        { rol: "alumno", texto: "¿Por qué gana #enviar?", fuentes: null },
        { rol: "tutor", texto: "Gana el id", fuentes: [{ videoId: "v04", segundo: 125 }] },
      ]);
    });

    it("sigue en la misma conversación con las siguientes preguntas del mismo módulo", async () => {
      const a = await guardarIntercambio({ usuarioId: lucia, moduloId: css, pregunta: "Uno", respuesta }, bd.db);
      const b = await guardarIntercambio({ usuarioId: lucia, moduloId: css, pregunta: "Dos", respuesta }, bd.db);

      expect(b.conversacionId).toBe(a.conversacionId);
      expect((await listarMensajes(a.conversacionId, bd.db)).map((m) => m.texto)).toEqual(["Uno", "Gana el id", "Dos", "Gana el id"]);
    });

    it("separa las conversaciones por alumno y por módulo", async () => {
      const base = await guardarIntercambio({ usuarioId: lucia, moduloId: css, pregunta: "x", respuesta }, bd.db);
      const otroModulo = await guardarIntercambio({ usuarioId: lucia, moduloId: html, pregunta: "x", respuesta }, bd.db);
      const otroAlumno = await guardarIntercambio({ usuarioId: pablo, moduloId: css, pregunta: "x", respuesta }, bd.db);

      expect(new Set([base.conversacionId, otroModulo.conversacionId, otroAlumno.conversacionId]).size).toBe(3);
    });

    it("abre una conversación nueva si la anterior ha caducado (90 días, RGPD)", async () => {
      const vieja = await guardarIntercambio({ usuarioId: lucia, moduloId: css, pregunta: "x", respuesta }, bd.db);
      await bd.db
        .update(conversacion)
        .set({ caduca: sql`now() - interval '1 day'` })
        .where(eq(conversacion.id, vieja.conversacionId));

      const nueva = await guardarIntercambio({ usuarioId: lucia, moduloId: css, pregunta: "y", respuesta }, bd.db);
      expect(nueva.conversacionId).not.toBe(vieja.conversacionId);
    });
  });

  describe("registrarIntercambio", () => {
    it("guarda el texto FILTRADO: ni el nombre del alumno ni sus datos personales llegan a la BBDD", async () => {
      const { conversacionId } = await registrarIntercambio(
        {
          usuarioId: lucia,
          moduloId: css,
          pregunta: "Soy Lucía Martín, mi móvil es 612345678. ¿Qué es el padding?",
          nombresOcultos: ["Lucía Martín"],
          respuesta: { rol: "tutor", texto: "Hola Lucía, el padding es el relleno.", fuentes: [] },
        },
        bd.db,
      );

      const guardado = await bd.db.select({ texto: mensaje.texto }).from(mensaje).where(eq(mensaje.conversacionId, conversacionId));
      const textos = guardado.map((m) => m.texto).join(" | ");
      expect(textos).toContain("Soy [NOMBRE], mi móvil es [TELEFONO]. ¿Qué es el padding?");
      expect(textos).toContain("Hola [NOMBRE], el padding es el relleno.");
      expect(textos).not.toMatch(/Lucía|Martín|612345678/);
    });
  });
});
