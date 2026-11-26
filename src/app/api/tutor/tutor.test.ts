import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { limiteSuperado, prohibido } from "@/server/compartido/errores";
import { consultarTutor } from "@/server/tutor/servicio";
import { POST } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/tutor/servicio", () => ({ consultarTutor: vi.fn() }));

const carmen = { id: "u-carmen", nombre: "Carmen López", email: "carmen@demo.test", rol: "alumno" as const, emailVerificado: true };
const contexto = { params: Promise.resolve({}) };
const respuesta = { mensaje: { rol: "tutor" as const, texto: "Gana el id", fuentes: [] }, fueraDeTemario: false, consultasRestantes: 29 };

function pregunta(cuerpo: unknown, conSesion = true) {
  return new Request("http://localhost/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(carmen);
  vi.mocked(consultarTutor).mockResolvedValue(respuesta);
});

describe("POST /api/tutor", () => {
  it("pregunta con el usuario de la SESIÓN, aunque el cuerpo traiga otro alumnoId", async () => {
    const res = await POST(pregunta({ alumnoId: "a1", moduloId: "m2-css", mensaje: " ¿Por qué gana #enviar? " }), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(respuesta);
    expect(consultarTutor).toHaveBeenCalledWith(carmen, { moduloId: "m2-css", mensaje: "¿Por qué gana #enviar?" });
  });

  it("sin sesión responde 401", async () => {
    expect((await POST(pregunta({ moduloId: "m2-css", mensaje: "hola" }, false), contexto)).status).toBe(401);
    expect(consultarTutor).not.toHaveBeenCalled();
  });

  it("valida la pregunta: vacía o de más de 1000 caracteres → 400", async () => {
    expect((await POST(pregunta({ moduloId: "m2-css", mensaje: "  " }), contexto)).status).toBe(400);
    expect((await POST(pregunta({ moduloId: "m2-css", mensaje: "x".repeat(1001) }), contexto)).status).toBe(400);
    expect(consultarTutor).not.toHaveBeenCalled();
  });

  it("traduce los errores del servicio: sin el curso 403, límite 429", async () => {
    vi.mocked(consultarTutor).mockRejectedValueOnce(prohibido());
    expect((await POST(pregunta({ moduloId: "m2-css", mensaje: "hola" }), contexto)).status).toBe(403);
    vi.mocked(consultarTutor).mockRejectedValueOnce(limiteSuperado());
    expect((await POST(pregunta({ moduloId: "m2-css", mensaje: "hola" }), contexto)).status).toBe(429);
  });
});
