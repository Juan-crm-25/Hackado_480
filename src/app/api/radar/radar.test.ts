import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { prohibido } from "@/server/compartido/errores";
import { obtenerRadar } from "@/server/radar/servicio";
import { GET } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/radar/servicio", () => ({ obtenerRadar: vi.fn() }));

const profesora = { id: "p1", nombre: "Ana Torres", email: "profesora@demo.test", rol: "profesor" as const, emailVerificado: true };
const alumna = { ...profesora, id: "a1", rol: "alumno" as const };
const contexto = { params: Promise.resolve({}) };

const peticion = (query = "?curso=desarrollo-web", conSesion = true) =>
  new Request(`http://localhost/api/radar${query}`, { headers: conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {} });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(profesora);
  vi.mocked(obtenerRadar).mockResolvedValue({ alumnos: 30 } as never);
});

describe("GET /api/radar", () => {
  it("devuelve el Radar del curso pedido a la profesora", async () => {
    const res = await GET(peticion(), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ alumnos: 30 });
    expect(obtenerRadar).toHaveBeenCalledWith(profesora, "desarrollo-web");
  });

  it("sin sesión responde 401", async () => {
    expect((await GET(peticion("?curso=desarrollo-web", false), contexto)).status).toBe(401);
    expect(obtenerRadar).not.toHaveBeenCalled();
  });

  it("un alumno no llega ni al servicio (403 por rol)", async () => {
    vi.mocked(usuarioDeToken).mockResolvedValue(alumna);
    expect((await GET(peticion(), contexto)).status).toBe(403);
    expect(obtenerRadar).not.toHaveBeenCalled();
  });

  it("si la profesora no da ese curso, el servicio responde 403", async () => {
    vi.mocked(obtenerRadar).mockRejectedValue(prohibido());
    expect((await GET(peticion(), contexto)).status).toBe(403);
  });

  it("sin curso responde 400", async () => {
    expect((await GET(peticion(""), contexto)).status).toBe(400);
    expect(obtenerRadar).not.toHaveBeenCalled();
  });
});
