import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { materialClase, modulo } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { Infografia, SeccionResumen, Tarjeta } from "@/lib/types";
import { guardarMaterialClase, leerMaterialPublicado, materialGuardado, type MaterialDeClase } from "./repositorio";

const hayBd = await bdPruebasDisponible();

const resumen = (videoId: string): SeccionResumen[] => [
  { titulo: `Idea de ${videoId}`, texto: `Lo esencial de ${videoId}`, fuente: { videoId, segundo: 30 } },
];
const tarjetas = (videoId: string): Tarjeta[] => [{ pregunta: `¿Qué se ve en ${videoId}?`, respuesta: "Esto", fuente: { videoId, segundo: 60 } }];
const infografia = (videoId: string, conceptoId: string): Infografia[] => [
  {
    conceptoId,
    titulo: `Esquema de ${videoId}`,
    plantilla: "pasos",
    elementos: [
      { nombre: "Uno", descripcion: "Primero" },
      { nombre: "Dos", descripcion: "Después" },
    ],
  },
];

const deVideo = (videoId: string, conceptoId = "css-especificidad"): MaterialDeClase[] => [
  { videoId, tipo: "resumen", contenido: resumen(videoId), modelo: "modelo-prueba" },
  { videoId, tipo: "tarjetas", contenido: tarjetas(videoId), modelo: "modelo-prueba" },
  { videoId, tipo: "infografia", contenido: infografia(videoId, conceptoId), modelo: "modelo-prueba" },
];

describe.skipIf(!hayBd)("material común de cada clase (con BBDD real)", () => {
  let bd: BdPrueba;
  let cssId: string;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    const [css] = await bd.db.select().from(modulo).where(eq(modulo.slug, "m2-css"));
    cssId = css.id;
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(materialClase);
  });

  const aprobarTodo = () => bd.db.update(materialClase).set({ revisado: true });

  it("guarda el material de cada vídeo sin revisar y dice qué hay guardado por vídeo y tipo", async () => {
    expect(await guardarMaterialClase(cssId, deVideo("v04"), {}, bd.db)).toBe(3);

    const filas = await bd.db.select().from(materialClase);
    expect(filas).toHaveLength(3);
    expect(filas.every((f) => f.revisado === false && f.modelo === "modelo-prueba")).toBe(true);

    expect(await materialGuardado(cssId, bd.db)).toEqual(
      expect.arrayContaining([
        { videoId: "v04", tipo: "resumen", revisado: false },
        { videoId: "v04", tipo: "tarjetas", revisado: false },
        { videoId: "v04", tipo: "infografia", revisado: false },
      ]),
    );
  });

  it("si un vídeo no es del módulo, falla sin guardar nada", async () => {
    const mezclado = [...deVideo("v04"), ...deVideo("v01")]; // v01 es de HTML
    await expect(guardarMaterialClase(cssId, mezclado, {}, bd.db)).rejects.toThrow(/v01/);
    expect(await bd.db.select().from(materialClase)).toHaveLength(0);
  });

  it("sin reemplazar, no pisa el material que ya existe", async () => {
    await guardarMaterialClase(cssId, deVideo("v04"), {}, bd.db);
    const otro: MaterialDeClase = { videoId: "v04", tipo: "resumen", contenido: resumen("otro"), modelo: "otro-modelo" };

    expect(await guardarMaterialClase(cssId, [otro], {}, bd.db)).toBe(0);
    const [fila] = await bd.db.select().from(materialClase).where(eq(materialClase.tipo, "resumen"));
    expect(fila.modelo).toBe("modelo-prueba");
  });

  it("con reemplazar, regenera lo que no está revisado pero nunca toca lo revisado", async () => {
    await guardarMaterialClase(cssId, deVideo("v04"), {}, bd.db);
    await bd.db.update(materialClase).set({ revisado: true }).where(eq(materialClase.tipo, "tarjetas"));

    const nuevo: MaterialDeClase[] = [
      { videoId: "v04", tipo: "resumen", contenido: resumen("nuevo"), modelo: "nuevo-modelo" },
      { videoId: "v04", tipo: "tarjetas", contenido: tarjetas("nuevo"), modelo: "nuevo-modelo" },
    ];
    expect(await guardarMaterialClase(cssId, nuevo, { reemplazar: true }, bd.db)).toBe(1);

    const porTipo = Object.fromEntries((await bd.db.select().from(materialClase)).map((f) => [f.tipo, f]));
    expect(porTipo.resumen.modelo).toBe("nuevo-modelo");
    expect(porTipo.resumen.contenido).toEqual(resumen("nuevo"));
    expect(porTipo.resumen.revisado).toBe(false);
    expect(porTipo.tarjetas.modelo).toBe("modelo-prueba");
    expect(porTipo.tarjetas.revisado).toBe(true);
  });

  it("lee solo lo revisado del módulo, con los vídeos en su orden", async () => {
    // Se guardan desordenados a propósito: el resultado sigue el orden de las clases (v04, v05, v06).
    await guardarMaterialClase(cssId, [...deVideo("v06", "css-unidades"), ...deVideo("v04"), ...deVideo("v05", "css-caja")], {}, bd.db);
    expect(await leerMaterialPublicado(cssId, bd.db)).toEqual({ resumen: [], tarjetas: [], infografias: [] });

    await aprobarTodo();
    await bd.db.update(materialClase).set({ revisado: false }).where(eq(materialClase.tipo, "infografia"));

    expect(await leerMaterialPublicado(cssId, bd.db)).toEqual({
      resumen: [...resumen("v04"), ...resumen("v05"), ...resumen("v06")],
      tarjetas: [...tarjetas("v04"), ...tarjetas("v05"), ...tarjetas("v06")],
      infografias: [],
    });
  });

  it("junta las infografías de todos los vídeos en una sola lista", async () => {
    await guardarMaterialClase(cssId, [...deVideo("v04"), ...deVideo("v05", "css-caja")], {}, bd.db);
    await aprobarTodo();

    const { infografias } = await leerMaterialPublicado(cssId, bd.db);
    expect(infografias.map((i) => i.conceptoId)).toEqual(["css-especificidad", "css-caja"]);
  });
});
