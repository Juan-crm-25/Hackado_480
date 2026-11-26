import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { errorIa } from "@/server/compartido/errores";
import { obtenerResumenDudas } from "@/server/radar/servicio";
import { GET } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/radar/servicio", () => ({ obtenerResumenDudas: vi.fn() }));

const profesora = { id: "p1", nombre: "Ana Torres", email: "profesora@demo.test", rol: "profesor" as const, emailVerificado: true };
const contexto = { params: Promise.resolve({}) };
const peticion = (query = "?curso=desarrollo-web") =>
  new Request(`http://localhost/api/radar/resumen${query}`, { headers: { cookie: `${COOKIE_SESION}=tok` } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(profesora);
});

describe("GET /api/radar/resumen", () => {
  it("devuelve el resumen de dudas del curso a la profesora", async () => {
    vi.mocked(obtenerResumenDudas).mockResolvedValue({ resumen: "Dudas sobre especificidad.", generado: "2026-11-29T10:00:00.000Z" });
    const res = await GET(peticion(), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resumen: "Dudas sobre especificidad.", generado: "2026-11-29T10:00:00.000Z" });
    expect(obtenerResumenDudas).toHaveBeenCalledWith(profesora, "desarrollo-web");
  });

  it("un alumno no llega al servicio (403)", async () => {
    vi.mocked(usuarioDeToken).mockResolvedValue({ ...profesora, rol: "alumno" });
    expect((await GET(peticion(), contexto)).status).toBe(403);
    expect(obtenerResumenDudas).not.toHaveBeenCalled();
  });

  it("si la IA falla responde 502", async () => {
    vi.mocked(obtenerResumenDudas).mockRejectedValue(errorIa());
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await GET(peticion(), contexto)).status).toBe(502);
  });

  it("sin curso responde 400", async () => {
    expect((await GET(peticion(""), contexto)).status).toBe(400);
  });
});
