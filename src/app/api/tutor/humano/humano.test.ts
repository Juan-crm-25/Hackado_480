import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { noEncontrado } from "@/server/compartido/errores";
import { listarMisDudasHumanas, pasarATutorHumano } from "@/server/tutor/servicio";
import { GET, POST } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/tutor/servicio", () => ({ pasarATutorHumano: vi.fn(), listarMisDudasHumanas: vi.fn() }));

const carmen = { id: "u-carmen", nombre: "Carmen López", email: "carmen@demo.test", rol: "alumno" as const, emailVerificado: true };
const contexto = { params: Promise.resolve({}) };
const cabeceras = (conSesion = true) => ({ "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(carmen);
});

describe("/api/tutor/humano", () => {
  it("POST pasa la pregunta del alumno de la sesión a un tutor humano", async () => {
    vi.mocked(pasarATutorHumano).mockResolvedValue({ id: "d1", estado: "pendiente" } as never);
    const res = await POST(new Request("http://localhost/api/tutor/humano", { method: "POST", headers: cabeceras(), body: JSON.stringify({ preguntaId: "p1" }) }), contexto);
    expect(res.status).toBe(200);
    expect(pasarATutorHumano).toHaveBeenCalledWith(carmen, "p1");
  });

  it("POST sin sesión → 401; pregunta ajena → 404", async () => {
    const pedir = (conSesion: boolean) =>
      POST(new Request("http://localhost/api/tutor/humano", { method: "POST", headers: cabeceras(conSesion), body: JSON.stringify({ preguntaId: "p1" }) }), contexto);
    expect((await pedir(false)).status).toBe(401);
    vi.mocked(pasarATutorHumano).mockRejectedValue(noEncontrado());
    expect((await pedir(true)).status).toBe(404);
  });

  it("GET lista las dudas del alumno en ese módulo", async () => {
    vi.mocked(listarMisDudasHumanas).mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/tutor/humano?modulo=m2-css", { headers: cabeceras() }), contexto);
    expect(res.status).toBe(200);
    expect(listarMisDudasHumanas).toHaveBeenCalledWith(carmen, "m2-css");
  });
});
