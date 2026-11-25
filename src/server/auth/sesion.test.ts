import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "./cookie";
import { usuarioDeToken } from "./servicio";
import { obtenerSesion } from "./sesion";

vi.mock("./servicio", () => ({ usuarioDeToken: vi.fn() }));

const lucia = { id: "u1", nombre: "Lucía Martín", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };

beforeEach(() => vi.clearAllMocks());

describe("obtenerSesion", () => {
  it("sin cookie es un visitante y no consulta la BBDD", async () => {
    expect(await obtenerSesion(new Request("http://localhost/api/x"))).toBeNull();
    expect(usuarioDeToken).not.toHaveBeenCalled();
  });

  it("con la cookie devuelve el usuario de esa sesión", async () => {
    vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
    const request = new Request("http://localhost/api/x", { headers: { cookie: `${COOKIE_SESION}=tok123` } });
    expect(await obtenerSesion(request)).toEqual(lucia);
    expect(usuarioDeToken).toHaveBeenCalledWith("tok123");
  });

  it("con una cookie de una sesión que ya no existe es un visitante", async () => {
    vi.mocked(usuarioDeToken).mockResolvedValue(null);
    const request = new Request("http://localhost/api/x", { headers: { cookie: `${COOKIE_SESION}=viejo` } });
    expect(await obtenerSesion(request)).toBeNull();
  });
});
