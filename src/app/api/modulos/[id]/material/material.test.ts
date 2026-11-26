import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { noEncontrado, prohibido } from "@/server/compartido/errores";
import { infografiasDelModulo, materialComunDelModulo } from "@/server/material/servicio";
import { GET as getInfografias } from "../infografias/route";
import { GET as getMaterial } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/material/servicio", () => ({ materialComunDelModulo: vi.fn(), infografiasDelModulo: vi.fn() }));

const contexto = { params: Promise.resolve({ id: "m2-css" }) };
const lucia = { id: "u1", nombre: "Lucía", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };
const peticion = (conSesion = true) =>
  new Request("http://localhost/api/modulos/m2-css/material", { headers: conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {} });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
});

describe("GET /api/modulos/[id]/material e /infografias", () => {
  it("sin sesión responde 401 y no lee nada", async () => {
    expect((await getMaterial(peticion(false), contexto)).status).toBe(401);
    expect((await getInfografias(peticion(false), contexto)).status).toBe(401);
    expect(materialComunDelModulo).not.toHaveBeenCalled();
    expect(infografiasDelModulo).not.toHaveBeenCalled();
  });

  it("devuelve el material del usuario de la sesión para ese módulo", async () => {
    vi.mocked(materialComunDelModulo).mockResolvedValue({ moduloId: "m2-css", resumen: [], tarjetas: [] });
    const res = await getMaterial(peticion(), contexto);
    expect(res.status).toBe(200);
    expect(materialComunDelModulo).toHaveBeenCalledWith(lucia, "m2-css");

    vi.mocked(infografiasDelModulo).mockResolvedValue({ moduloId: "m2-css", infografias: [] });
    expect((await getInfografias(peticion(), contexto)).status).toBe(200);
    expect(infografiasDelModulo).toHaveBeenCalledWith(lucia, "m2-css");
  });

  it("traduce los errores del servicio: sin el curso 403, sin material 404", async () => {
    vi.mocked(materialComunDelModulo).mockRejectedValue(prohibido("Necesitas tener este curso"));
    expect((await getMaterial(peticion(), contexto)).status).toBe(403);
    vi.mocked(infografiasDelModulo).mockRejectedValue(noEncontrado("Este módulo todavía no tiene infografías"));
    expect((await getInfografias(peticion(), contexto)).status).toBe(404);
  });
});
