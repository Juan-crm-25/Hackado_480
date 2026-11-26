import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { materialPersonal, usoIa, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { ErrorIA } from "@/lib/ai/cliente";
import { ErrorMaterial, type EntradaMaterialPersonal } from "@/lib/agentes/material-personal";
import type { MaterialPersonal } from "@/lib/types";
import type { UsuarioSesion } from "@/server/auth/roles";
import { crearMaterialPersonal, listarMiMaterialPersonal } from "./servicio";

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("material personal con la sesión del usuario (con BBDD real)", () => {
  let bd: BdPrueba;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];
  /** El generador (IA) simulado: devuelve tarjetas para quien las pida. */
  const generar = () =>
    vi.fn(async ({ peticion }: EntradaMaterialPersonal): Promise<MaterialPersonal> => ({
      id: crypto.randomUUID(),
      alumnoId: peticion.alumnoId,
      moduloId: peticion.moduloId,
      tipo: "tarjetas",
      nivel: "normal",
      generado: new Date().toISOString(),
      tarjetas: [{ pregunta: "¿P?", respuesta: "R" }],
    }));
  const pedir = { moduloId: "m2-css", tipo: "tarjetas" as const };

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    await bd.db.insert(usuario).values({ nombre: "Sin Curso", email: "sincurso.mp@demo.test", emailVerificado: true, seudonimo: "alumno_sincurso_mp" });
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(materialPersonal);
    await bd.db.delete(usoIa);
  });

  it("crea el material del usuario de la SESIÓN, oculta su nombre y gasta SU límite", async () => {
    const carmen = await sesion("carmen@demo.test");
    const deps = { generar: generar() };

    const r = await crearMaterialPersonal(carmen, { ...pedir, enfoque: "soy Carmen López" }, bd.db, deps);

    expect(r.consultasRestantes).toBe(29);
    expect(deps.generar.mock.calls[0][0]).toMatchObject({ nombresOcultos: ["Carmen López"], peticion: { alumnoId: carmen.id } });
    const [fila] = await bd.db.select().from(materialPersonal);
    expect(fila.usuarioId).toBe(carmen.id);
    const [uso] = await bd.db.select().from(usoIa);
    expect(uso.usuarioId).toBe(carmen.id);
  });

  it("cada alumno ve SOLO su material", async () => {
    const carmen = await sesion("carmen@demo.test");
    const lucia = await sesion("lucia@demo.test");
    await crearMaterialPersonal(carmen, pedir, bd.db, { generar: generar() });

    expect(await listarMiMaterialPersonal(carmen, "m2-css", bd.db)).toHaveLength(1);
    expect(await listarMiMaterialPersonal(lucia, "m2-css", bd.db)).toEqual([]);
    expect(await listarMiMaterialPersonal(carmen, "m1-html", bd.db)).toEqual([]);
  });

  it("quien no tiene el curso no puede crear material (403) ni gasta consultas", async () => {
    const deps = { generar: generar() };
    await expect(crearMaterialPersonal(await sesion("sincurso.mp@demo.test"), pedir, bd.db, deps)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    expect(deps.generar).not.toHaveBeenCalled();
    expect(await bd.db.select().from(usoIa)).toEqual([]);
  });

  it("un módulo que no existe: 404; un módulo sin transcripciones: 400 sin gastar consultas", async () => {
    const carmen = await sesion("carmen@demo.test");
    await expect(crearMaterialPersonal(carmen, { ...pedir, moduloId: "m9" }, bd.db, { generar: generar() })).rejects.toMatchObject({
      codigo: "NO_ENCONTRADO",
    });
    // Todos los módulos de la demo tienen transcripciones: se simula uno que no, con el generador.
    const sinContenido = vi.fn().mockRejectedValue(new ErrorMaterial("Todavía no tengo el contenido de los vídeos"));
    await expect(crearMaterialPersonal(carmen, pedir, bd.db, { generar: sinContenido })).rejects.toMatchObject({ codigo: "DATOS_INVALIDOS" });
  });

  it("al llegar al límite diario: 429 sin llamar a la IA", async () => {
    const carmen = await sesion("carmen@demo.test");
    await bd.db.insert(usoIa).values({ usuarioId: carmen.id, dia: new Date().toISOString().slice(0, 10), total: 30 });
    const deps = { generar: generar() };
    await expect(crearMaterialPersonal(carmen, pedir, bd.db, deps)).rejects.toMatchObject({ codigo: "LIMITE_SUPERADO" });
    expect(deps.generar).not.toHaveBeenCalled();
  });

  it("si la IA falla: 502 y no se guarda nada", async () => {
    const carmen = await sesion("carmen@demo.test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      crearMaterialPersonal(carmen, pedir, bd.db, { generar: vi.fn().mockRejectedValue(new ErrorIA("caído", 503)) }),
    ).rejects.toMatchObject({ codigo: "ERROR_IA" });
    expect(await bd.db.select().from(materialPersonal)).toEqual([]);
  });
});
