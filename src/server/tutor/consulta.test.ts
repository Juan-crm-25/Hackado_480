import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { conversacion, mensaje, usoIa, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { ErrorIA } from "@/lib/ai/cliente";
import type { UsuarioSesion } from "@/server/auth/roles";
import { consultarTutor } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("consultarTutor: el tutor con la sesión del usuario (con BBDD real)", () => {
  let bd: BdPrueba;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];
  const respuesta = { rol: "tutor" as const, texto: "Gana el id", fuentes: [{ videoId: "v04", segundo: 125 }] };
  const preguntar = () => vi.fn().mockResolvedValue({ mensaje: respuesta, fueraDeTemario: false, simulado: false });
  const pedir = { moduloId: "m2-css", mensaje: "¿Por qué gana #enviar?" };

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    // Alguien registrado pero sin el curso.
    await bd.db.insert(usuario).values({ nombre: "Sin Curso", email: "sincurso@demo.test", emailVerificado: true, seudonimo: "alumno_sincurso" });
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(conversacion);
    await bd.db.delete(usoIa);
  });

  it("responde y guarda la conversación con el usuario de la SESIÓN, ocultando su nombre", async () => {
    const carmen = await sesion("carmen@demo.test");
    const deps = { preguntar: preguntar() };

    const r = await consultarTutor(carmen, { ...pedir, mensaje: "Soy Carmen López, ¿por qué gana #enviar?" }, bd.db, deps);

    expect(r.mensaje).toEqual(respuesta);
    expect(r.consultasRestantes).toBe(29);
    expect(deps.preguntar.mock.calls[0][0].nombresOcultos).toEqual(["Carmen López"]);
    const [c] = await bd.db.select().from(conversacion);
    expect(c.usuarioId).toBe(carmen.id);
    const textos = (await bd.db.select({ texto: mensaje.texto }).from(mensaje)).map((m) => m.texto);
    expect(textos).toContain("Soy [NOMBRE], ¿por qué gana #enviar?");
    expect(r.preguntaId).toEqual(expect.any(String));
  });

  it("quien no tiene el curso no puede usar su tutor (403) y no gasta consultas", async () => {
    const deps = { preguntar: preguntar() };
    await expect(consultarTutor(await sesion("sincurso@demo.test"), pedir, bd.db, deps)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    expect(deps.preguntar).not.toHaveBeenCalled();
    expect(await bd.db.select().from(usoIa)).toEqual([]);
  });

  it("la profesora del curso y el admin sí pueden", async () => {
    for (const email of ["profesora@demo.test", "admin@demo.test"]) {
      await expect(consultarTutor(await sesion(email), pedir, bd.db, { preguntar: preguntar() })).resolves.toMatchObject({ mensaje: respuesta });
    }
  });

  it("un módulo que no existe responde 404", async () => {
    await expect(consultarTutor(await sesion("carmen@demo.test"), { ...pedir, moduloId: "m9" }, bd.db, { preguntar: preguntar() })).rejects.toMatchObject({
      codigo: "NO_ENCONTRADO",
    });
  });

  it("al llegar al límite diario responde LIMITE_SUPERADO (429) sin llamar a la IA", async () => {
    const carmen = await sesion("carmen@demo.test");
    await bd.db.insert(usoIa).values({ usuarioId: carmen.id, dia: new Date().toISOString().slice(0, 10), total: 30 });
    const deps = { preguntar: preguntar() };
    await expect(consultarTutor(carmen, pedir, bd.db, deps)).rejects.toMatchObject({ codigo: "LIMITE_SUPERADO" });
    expect(deps.preguntar).not.toHaveBeenCalled();
  });

  it("si la IA falla responde ERROR_IA (502) y no guarda nada; en modo simulado tampoco guarda", async () => {
    const carmen = await sesion("carmen@demo.test");
    await expect(
      consultarTutor(carmen, pedir, bd.db, { preguntar: vi.fn().mockRejectedValue(new ErrorIA("caído", 503)) }),
    ).rejects.toMatchObject({ codigo: "ERROR_IA" });
    const simulado = vi.fn().mockResolvedValue({ mensaje: respuesta, fueraDeTemario: false, simulado: true });
    const r = await consultarTutor(carmen, pedir, bd.db, { preguntar: simulado });
    expect(r.preguntaId).toBeUndefined();
    expect(await bd.db.select().from(mensaje)).toEqual([]);
  });
});
