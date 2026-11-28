import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { clase, materialClase, modulo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "@/server/auth/roles";
import { guardarMaterialClase } from "./repositorio";
import { estudioDelVideo } from "./servicio";

const hayBd = await bdPruebasDisponible();

const resumen = (videoId: string) => [{ titulo: `Resumen de ${videoId}`, texto: "Un id gana a una clase", fuente: { videoId, segundo: 70 } }];
const tarjetas = [{ pregunta: "¿Quién gana?", respuesta: "El id", fuente: { videoId: "v04", segundo: 90 } }];

describe.skipIf(!hayBd)("panel de estudio de un vídeo (con BBDD real)", () => {
  let bd: BdPrueba;
  let cssId: string;
  const sesion = async (email: string): Promise<UsuarioSesion> =>
    (
      await bd.db
        .select({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, emailVerificado: usuario.emailVerificado })
        .from(usuario)
        .where(eq(usuario.email, email))
    )[0];

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    await bd.db.insert(usuario).values({ nombre: "Sin Curso", email: "sincurso.ev@demo.test", emailVerificado: true, seudonimo: "alumno_sincurso_ev" });
    [{ id: cssId }] = await bd.db.select().from(modulo).where(eq(modulo.slug, "m2-css"));
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(materialClase);
    await guardarMaterialClase(
      cssId,
      [
        { videoId: "v04", tipo: "resumen", contenido: resumen("v04"), modelo: "m" },
        { videoId: "v04", tipo: "tarjetas", contenido: tarjetas, modelo: "m" },
        { videoId: "v05", tipo: "resumen", contenido: resumen("v05"), modelo: "m" },
      ],
      {},
      bd.db,
    );
    // Revisado: el resumen de v04 y el de v05. Las tarjetas de v04 siguen sin revisar.
    const [v04] = await bd.db.select().from(clase).where(and(eq(clase.moduloId, cssId), eq(clase.slug, "v04")));
    const [v05] = await bd.db.select().from(clase).where(and(eq(clase.moduloId, cssId), eq(clase.slug, "v05")));
    await bd.db.update(materialClase).set({ revisado: true }).where(and(eq(materialClase.claseId, v04.id), eq(materialClase.tipo, "resumen")));
    await bd.db.update(materialClase).set({ revisado: true }).where(eq(materialClase.claseId, v05.id));
  });

  it("da la transcripción del vídeo agrupada en bloques de ~30 s y SOLO su material revisado", async () => {
    const r = await estudioDelVideo(await sesion("carmen@demo.test"), "m2-css", "v04", bd.db);

    expect(r).toMatchObject({ moduloId: "m2-css", videoId: "v04" });
    expect(r.transcripcion.length).toBeGreaterThan(10);
    expect(r.transcripcion[0].inicio).toBeLessThan(5);
    const huecos = r.transcripcion.slice(1).map((f, i) => f.inicio - r.transcripcion[i].inicio);
    expect(Math.min(...huecos)).toBeGreaterThanOrEqual(20); // agrupada, no cada ~15 s
    expect(r.resumen.map((s) => s.titulo)).toEqual(["Resumen de v04"]); // nada de v05
    expect(r.tarjetas).toEqual([]); // sin revisar
    expect(r.infografias).toEqual([]);
  });

  it("un vídeo sin nada revisado da listas vacías (el panel lo dice), no un error", async () => {
    const r = await estudioDelVideo(await sesion("carmen@demo.test"), "m2-css", "v06", bd.db);
    expect(r.resumen).toEqual([]);
    expect(r.transcripcion.length).toBeGreaterThan(0);
  });

  it("sin el curso 403; módulo o vídeo que no existe (o que no es de ese módulo) 404", async () => {
    await expect(estudioDelVideo(await sesion("sincurso.ev@demo.test"), "m2-css", "v04", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    await expect(estudioDelVideo(await sesion("carmen@demo.test"), "m9-nada", "v04", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(estudioDelVideo(await sesion("carmen@demo.test"), "m2-css", "v01", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });
});
