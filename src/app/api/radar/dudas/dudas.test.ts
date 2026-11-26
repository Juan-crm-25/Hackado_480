import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { conflicto } from "@/server/compartido/errores";
import { listarDudasHumanasDelCurso, responderDudaHumana } from "@/server/tutor/servicio";
import { GET } from "./route";
import { POST } from "./[id]/respuesta/route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/tutor/servicio", () => ({ listarDudasHumanasDelCurso: vi.fn(), responderDudaHumana: vi.fn() }));

const profesora = { id: "p1", nombre: "Ana Torres", email: "profesora@demo.test", rol: "profesor" as const, emailVerificado: true };
const cabeceras = { "content-type": "application/json", cookie: `${COOKIE_SESION}=tok` };
const responder = (cuerpo: unknown) =>
  POST(new Request("http://localhost/api/radar/dudas/d1/respuesta", { method: "POST", headers: cabeceras, body: JSON.stringify(cuerpo) }), {
    params: Promise.resolve({ id: "d1" }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(profesora);
});

describe("/api/radar/dudas", () => {
  it("GET devuelve las dudas del curso a la profesora", async () => {
    vi.mocked(listarDudasHumanasDelCurso).mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/radar/dudas?curso=desarrollo-web", { headers: cabeceras }), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(listarDudasHumanasDelCurso).toHaveBeenCalledWith(profesora, "desarrollo-web");
  });

  it("un alumno no llega a ninguno de los dos (403)", async () => {
    vi.mocked(usuarioDeToken).mockResolvedValue({ ...profesora, rol: "alumno" });
    expect((await GET(new Request("http://localhost/api/radar/dudas?curso=desarrollo-web", { headers: cabeceras }), { params: Promise.resolve({}) })).status).toBe(403);
    expect((await responder({ respuesta: "Hola" })).status).toBe(403);
    expect(responderDudaHumana).not.toHaveBeenCalled();
  });

  it("POST guarda la respuesta; vacía → 400; ya respondida → 409", async () => {
    vi.mocked(responderDudaHumana).mockResolvedValue({ id: "d1", estado: "respondida" } as never);
    expect((await responder({ respuesta: " Un id pesa más. " })).status).toBe(200);
    expect(responderDudaHumana).toHaveBeenCalledWith(profesora, "d1", "Un id pesa más.");
    expect((await responder({ respuesta: "  " })).status).toBe(400);
    vi.mocked(responderDudaHumana).mockRejectedValue(conflicto());
    expect((await responder({ respuesta: "Otra" })).status).toBe(409);
  });
});
