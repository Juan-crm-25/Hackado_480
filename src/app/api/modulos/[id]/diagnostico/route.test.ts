import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { obtenerDiagnosticoModulo, responderDiagnosticoModulo } from "@/server/evaluaciones/servicio";
import { GET, POST } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/evaluaciones/servicio", () => ({
  obtenerDiagnosticoModulo: vi.fn(),
  responderDiagnosticoModulo: vi.fn(),
}));

const contexto = { params: Promise.resolve({ id: "m2-css" }) };
const lucia = { id: "u1", nombre: "Lucía", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };
const URL_DIAG = "http://localhost/api/modulos/m2-css/diagnostico";

function peticion(metodo: "GET" | "POST", cuerpo?: unknown, conSesion = true) {
  return new Request(URL_DIAG, {
    method: metodo,
    headers: { "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
});

describe("/api/modulos/[id]/diagnostico", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET(peticion("GET", undefined, false), contexto)).status).toBe(401);
    expect((await POST(peticion("POST", { respuestas: { p1: 0 } }, false), contexto)).status).toBe(401);
    expect(responderDiagnosticoModulo).not.toHaveBeenCalled();
  });

  it("GET devuelve las preguntas del diagnóstico del módulo", async () => {
    vi.mocked(obtenerDiagnosticoModulo).mockResolvedValue({ modulo: { id: "m2-css", titulo: "CSS" }, preguntas: [] });
    const res = await GET(peticion("GET"), contexto);
    expect(res.status).toBe(200);
    expect(obtenerDiagnosticoModulo).toHaveBeenCalledWith(lucia, "m2-css");
  });

  it("POST evalúa las respuestas enviadas", async () => {
    vi.mocked(responderDiagnosticoModulo).mockResolvedValue({
      modulo: { id: "m2-css", titulo: "CSS" },
      aciertos: 3,
      total: 3,
      dominado: true,
      orden: ["m1-html", "m3-responsive", "m4-javascript", "m2-css"],
      principal: "m1-html",
      mensaje: "ok",
    });
    const respuestas = { "diag-css-1": 2, "diag-css-2": 1, "diag-css-3": 2 };
    const res = await POST(peticion("POST", { respuestas }), contexto);
    expect(res.status).toBe(200);
    expect(responderDiagnosticoModulo).toHaveBeenCalledWith(lucia, "m2-css", { respuestas });
  });

  it("POST con cuerpo vacío responde 400", async () => {
    const res = await POST(peticion("POST", { respuestas: {} }), contexto);
    expect(res.status).toBe(400);
    expect(responderDiagnosticoModulo).not.toHaveBeenCalled();
  });
});