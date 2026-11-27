import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { conflicto } from "@/server/compartido/errores";
import { canjearPremio, obtenerSaldoPremios, sumarPuntosDemo } from "@/server/recompensas/servicio";
import { POST as POST_CANJE } from "./canje/route";
import { POST as POST_DEMO } from "./demo/route";
import { GET } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/recompensas/servicio", () => ({
  obtenerSaldoPremios: vi.fn(),
  canjearPremio: vi.fn(),
  sumarPuntosDemo: vi.fn(),
}));

const contexto = { params: Promise.resolve({}) };
const lucia = { id: "u1", nombre: "Lucía", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };
const SALDO = { foro: 0, respuestas: 0, profesor: 0, demo: 400, canjeado: 100, saldo: 300, canjeados: ["preguntas-tutor"] };

function peticion(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown, conSesion = true) {
  return new Request(`http://localhost/api/yo/premios${ruta}`, {
    method: metodo,
    headers: { "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
});

describe("/api/yo/premios", () => {
  it("sin sesión responde 401 y no toca el saldo", async () => {
    expect((await GET(peticion("GET", "", undefined, false), contexto)).status).toBe(401);
    expect((await POST_CANJE(peticion("POST", "/canje", { premio: "pato-480" }, false), contexto)).status).toBe(401);
    expect((await POST_DEMO(peticion("POST", "/demo", { puntos: 100 }, false), contexto)).status).toBe(401);
    expect(canjearPremio).not.toHaveBeenCalled();
    expect(sumarPuntosDemo).not.toHaveBeenCalled();
  });

  it("GET devuelve el saldo del usuario de la sesión", async () => {
    vi.mocked(obtenerSaldoPremios).mockResolvedValue(SALDO);
    const res = await GET(peticion("GET", ""), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SALDO);
    expect(obtenerSaldoPremios).toHaveBeenCalledWith("u1");
  });

  it("POST /canje canjea el premio pedido y devuelve el saldo nuevo", async () => {
    vi.mocked(canjearPremio).mockResolvedValue(SALDO);
    const res = await POST_CANJE(peticion("POST", "/canje", { premio: "preguntas-tutor" }), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(SALDO);
    expect(canjearPremio).toHaveBeenCalledWith("u1", "preguntas-tutor");
  });

  it("POST /canje sin premio responde 400", async () => {
    const res = await POST_CANJE(peticion("POST", "/canje", {}), contexto);
    expect(res.status).toBe(400);
    expect(canjearPremio).not.toHaveBeenCalled();
  });

  it("POST /canje sin saldo suficiente responde 409 con el motivo", async () => {
    vi.mocked(canjearPremio).mockRejectedValue(conflicto("No tienes puntos suficientes para este premio"));
    const res = await POST_CANJE(peticion("POST", "/canje", { premio: "pato-480" }), contexto);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("No tienes puntos suficientes para este premio");
  });

  it("POST /demo suma 100 o 1000 puntos de demo al usuario de la sesión", async () => {
    vi.mocked(sumarPuntosDemo).mockResolvedValue({ ...SALDO, demo: 1400, saldo: 1300 });
    for (const puntos of [100, 1000]) {
      const res = await POST_DEMO(peticion("POST", "/demo", { puntos }), contexto);
      expect(res.status).toBe(200);
      expect(sumarPuntosDemo).toHaveBeenLastCalledWith("u1", puntos);
    }
  });

  it("POST /demo con otra cantidad responde 400 (no se puede sumar lo que uno quiera)", async () => {
    for (const cuerpo of [{ puntos: 99999 }, { puntos: -100 }, {}]) {
      expect((await POST_DEMO(peticion("POST", "/demo", cuerpo), contexto)).status).toBe(400);
    }
    expect(sumarPuntosDemo).not.toHaveBeenCalled();
  });
});
