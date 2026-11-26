import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { conversacion, dudaHumana, modulo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "@/server/auth/roles";
import { guardarIntercambio } from "./repositorio";
import { listarDudasHumanasDelCurso, listarMisDudasHumanas, pasarATutorHumano, responderDudaHumana } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("tutor humano, H9 (con BBDD real)", () => {
  let bd: BdPrueba;
  let carmen: UsuarioSesion;
  let javier: UsuarioSesion;
  let profesora: UsuarioSesion;
  let css: string;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];
  /** Una pregunta guardada del alumno en CSS; devuelve su id (el preguntaId que da POST /api/tutor). */
  const preguntaDe = async (u: UsuarioSesion, texto = "¿Por qué gana #enviar?") =>
    (await guardarIntercambio({ usuarioId: u.id, moduloId: css, pregunta: texto, respuesta: { texto: "Por la especificidad", fuentes: [] } }, bd.db))
      .preguntaId;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    carmen = await sesion("carmen@demo.test");
    javier = await sesion("javier@demo.test");
    profesora = await sesion("profesora@demo.test");
    css = (await bd.db.select().from(modulo).where(eq(modulo.slug, "m2-css")))[0].id;
    await bd.db.insert(usuario).values({ nombre: "Otra Profe", email: "otra.profe@demo.test", rol: "profesor", emailVerificado: true, seudonimo: "profesor_otra_h9" });
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(conversacion);
  });

  describe("pasarATutorHumano", () => {
    it("el alumno pasa SU pregunta y queda pendiente; pasarla dos veces no la duplica", async () => {
      const preguntaId = await preguntaDe(carmen);
      const duda = await pasarATutorHumano(carmen, preguntaId, bd.db);
      expect(duda).toMatchObject({ preguntaId, pregunta: "¿Por qué gana #enviar?", moduloId: "m2-css", estado: "pendiente" });
      expect(duda.respuesta).toBeUndefined();

      expect((await pasarATutorHumano(carmen, preguntaId, bd.db)).id).toBe(duda.id);
      expect(await bd.db.select().from(dudaHumana)).toHaveLength(1);
    });

    it("no puede pasar la pregunta de otro alumno (404: ni siquiera sabe que existe)", async () => {
      const deCarmen = await preguntaDe(carmen);
      await expect(pasarATutorHumano(javier, deCarmen, bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    });

    it("una pregunta que no existe o un id mal formado también dan 404", async () => {
      await expect(pasarATutorHumano(carmen, "00000000-0000-0000-0000-000000000000", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    });
  });

  describe("la profesora responde desde el Radar", () => {
    it("ve las dudas pendientes de su curso con el alumno y el módulo, y las responde", async () => {
      const preguntaId = await preguntaDe(carmen);
      const { id } = await pasarATutorHumano(carmen, preguntaId, bd.db);

      const pendientes = await listarDudasHumanasDelCurso(profesora, "desarrollo-web", bd.db);
      expect(pendientes).toEqual([expect.objectContaining({ id, alumno: "Carmen López", modulo: "CSS", estado: "pendiente" })]);

      const respondida = await responderDudaHumana(profesora, id, "  Un id pesa más que cualquier número de clases.  ", bd.db);
      expect(respondida).toMatchObject({ id, estado: "respondida", respuesta: "Un id pesa más que cualquier número de clases." });
      expect(respondida.respondida).toEqual(expect.any(String));
    });

    it("no se puede responder dos veces (409)", async () => {
      const { id } = await pasarATutorHumano(carmen, await preguntaDe(carmen), bd.db);
      await responderDudaHumana(profesora, id, "Primera respuesta", bd.db);
      await expect(responderDudaHumana(profesora, id, "Otra", bd.db)).rejects.toMatchObject({ codigo: "CONFLICTO" });
    });

    it("una profesora de otro curso no puede ver ni responder estas dudas (403)", async () => {
      const otra = await sesion("otra.profe@demo.test");
      const { id } = await pasarATutorHumano(carmen, await preguntaDe(carmen), bd.db);
      await expect(listarDudasHumanasDelCurso(otra, "desarrollo-web", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(responderDudaHumana(otra, id, "Hola", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    });

    it("un alumno no puede responder (403)", async () => {
      const { id } = await pasarATutorHumano(carmen, await preguntaDe(carmen), bd.db);
      await expect(responderDudaHumana(javier, id, "Yo lo sé", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    });
  });

  describe("el alumno ve la respuesta en su chat", () => {
    it("lista solo SUS dudas de ese módulo, con la respuesta cuando la hay", async () => {
      const suya = await pasarATutorHumano(carmen, await preguntaDe(carmen, "Mi duda"), bd.db);
      await pasarATutorHumano(javier, await preguntaDe(javier, "Duda de Javier"), bd.db);
      await responderDudaHumana(profesora, suya.id, "Respuesta de tu tutora", bd.db);

      const mias = await listarMisDudasHumanas(carmen, "m2-css", bd.db);
      expect(mias).toEqual([expect.objectContaining({ pregunta: "Mi duda", estado: "respondida", respuesta: "Respuesta de tu tutora" })]);
      expect(await listarMisDudasHumanas(carmen, "m1-html", bd.db)).toEqual([]);
    });
  });
});
