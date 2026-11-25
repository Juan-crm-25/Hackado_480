import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { ErrorApp } from "@/server/compartido/errores";
import { confirmarPago, crearCheckout } from "@/server/pagos/servicio";
import { POST as checkout } from "./checkout/route";
import { POST as confirmar } from "./confirmar/route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/pagos/servicio", () => ({ crearCheckout: vi.fn(), confirmarPago: vi.fn() }));

const contexto = { params: Promise.resolve({}) };
const lucia = { id: "u1", nombre: "Lucía", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };

function post(url: string, cuerpo: unknown, conSesion = true) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
});

describe("POST /api/pagos/checkout", () => {
  it("sin sesión responde 401 y no crea nada", async () => {
    const res = await checkout(post("/api/pagos/checkout", { curso: "python-desde-cero" }, false), contexto);
    expect(res.status).toBe(401);
    expect(crearCheckout).not.toHaveBeenCalled();
  });

  it("con sesión devuelve la sesión de pago del usuario", async () => {
    const sesion = { id: "cs_test_x", object: "checkout.session", amount_total: 4900 };
    vi.mocked(crearCheckout).mockResolvedValue(sesion as never);
    const res = await checkout(post("/api/pagos/checkout", { curso: "python-desde-cero" }), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(sesion);
    expect(crearCheckout).toHaveBeenCalledWith(lucia, { curso: "python-desde-cero" });
  });

  it("si ya tiene el curso responde 409", async () => {
    vi.mocked(crearCheckout).mockRejectedValue(new ErrorApp("CONFLICTO", "Ya tienes este curso"));
    const res = await checkout(post("/api/pagos/checkout", { curso: "desarrollo-web" }), contexto);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/pagos/confirmar", () => {
  it("sin sesión responde 401", async () => {
    const res = await confirmar(post("/api/pagos/confirmar", { sesion: "cs_test_x", metodo: "bizum" }, false), contexto);
    expect(res.status).toBe(401);
    expect(confirmarPago).not.toHaveBeenCalled();
  });

  it("con tarjeta pide número, caducidad y CVC (cualquier valor), y no los devuelve", async () => {
    vi.mocked(confirmarPago).mockResolvedValue({ id: "pi_test_x", status: "succeeded" } as never);
    const tarjeta = { numero: "1", caducidad: "x", cvc: "9", titular: "" };
    const res = await confirmar(post("/api/pagos/confirmar", { sesion: "cs_test_x", metodo: "tarjeta", tarjeta }), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "pi_test_x", status: "succeeded" });
    expect(confirmarPago).toHaveBeenCalledWith(lucia, { sesion: "cs_test_x", metodo: "tarjeta", tarjeta });
  });

  it("con tarjeta y sin número responde 400", async () => {
    const tarjeta = { numero: "  ", caducidad: "12/30", cvc: "123", titular: "" };
    const res = await confirmar(post("/api/pagos/confirmar", { sesion: "cs_test_x", metodo: "tarjeta", tarjeta }), contexto);
    expect(res.status).toBe(400);
    expect(confirmarPago).not.toHaveBeenCalled();
  });

  it("con un método que no existe responde 400", async () => {
    const res = await confirmar(post("/api/pagos/confirmar", { sesion: "cs_test_x", metodo: "efectivo" }), contexto);
    expect(res.status).toBe(400);
  });
});
