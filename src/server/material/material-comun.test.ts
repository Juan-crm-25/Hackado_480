import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { materialClase, modulo, usuario } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import type { UsuarioSesion } from "@/server/auth/roles";
import { ErrorApp } from "@/server/compartido/errores";
import { guardarMaterialClase } from "./repositorio";
import { infografiasDelModulo, leerMaterialDelModulo, materialComunDelModulo } from "./servicio";

const hayBd = await bdPruebasDisponible();

const resumen = [{ titulo: "Especificidad", texto: "Un id gana a una clase", fuente: { videoId: "v04", segundo: 70 } }];
const tarjetas = [{ pregunta: "¿Quién gana?", respuesta: "El id", fuente: { videoId: "v04", segundo: 90 } }];
const infografia = [
  {
    conceptoId: "css-especificidad",
    titulo: "Quién gana",
    plantilla: "jerarquia" as const,
    elementos: [
      { nombre: "id", descripcion: "100" },
      { nombre: "clase", descripcion: "10" },
    ],
  },
];

/** El código (`codigo`) del error de la app que lanza la promesa. */
async function codigoDeError(promesa: Promise<unknown>): Promise<string | undefined> {
  try {
    await promesa;
  } catch (e) {
    return e instanceof ErrorApp ? e.codigo : "otro";
  }
  return undefined;
}

describe.skipIf(!hayBd)("material común del módulo para el usuario de la sesión (con BBDD real)", () => {
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
    await bd.db.insert(usuario).values({ nombre: "Sin Curso", email: "sincurso.mc@demo.test", emailVerificado: true, seudonimo: "alumno_sincurso_mc" });
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
        { videoId: "v04", tipo: "resumen", contenido: resumen, modelo: "m" },
        { videoId: "v04", tipo: "tarjetas", contenido: tarjetas, modelo: "m" },
        { videoId: "v04", tipo: "infografia", contenido: infografia, modelo: "m" },
      ],
      {},
      bd.db,
    );
  });

  const aprobar = () => bd.db.update(materialClase).set({ revisado: true });

  it("un alumno con el curso ve el material revisado del módulo, con el módulo por su slug", async () => {
    await aprobar();
    const lucia = await sesion("lucia@demo.test");
    expect(await leerMaterialDelModulo(lucia, "m2-css", bd.db)).toEqual({ moduloId: "m2-css", resumen, tarjetas, infografias: infografia });
  });

  it("lo que no está revisado no se ve", async () => {
    const lucia = await sesion("lucia@demo.test");
    expect(await leerMaterialDelModulo(lucia, "m2-css", bd.db)).toEqual({ moduloId: "m2-css", resumen: [], tarjetas: [], infografias: [] });
  });

  it("sin el curso: 403; módulo que no existe: 404", async () => {
    await aprobar();
    const sinCurso = await sesion("sincurso.mc@demo.test");
    const lucia = await sesion("lucia@demo.test");
    expect(await codigoDeError(leerMaterialDelModulo(sinCurso, "m2-css", bd.db))).toBe("PROHIBIDO");
    expect(await codigoDeError(leerMaterialDelModulo(lucia, "m9-nada", bd.db))).toBe("NO_ENCONTRADO");
  });

  it("para la API: el resumen y las tarjetas, o 404 si aún no hay nada revisado", async () => {
    const lucia = await sesion("lucia@demo.test");
    expect(await codigoDeError(materialComunDelModulo(lucia, "m2-css", bd.db))).toBe("NO_ENCONTRADO");
    await aprobar();
    expect(await materialComunDelModulo(lucia, "m2-css", bd.db)).toEqual({ moduloId: "m2-css", resumen, tarjetas });
  });

  it("para la API: las infografías, o 404 si aún no hay ninguna revisada", async () => {
    const lucia = await sesion("lucia@demo.test");
    expect(await codigoDeError(infografiasDelModulo(lucia, "m2-css", bd.db))).toBe("NO_ENCONTRADO");
    await aprobar();
    expect(await infografiasDelModulo(lucia, "m2-css", bd.db)).toEqual({ moduloId: "m2-css", infografias: infografia });
  });
});
