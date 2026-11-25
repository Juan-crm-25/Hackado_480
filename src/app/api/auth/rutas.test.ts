import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorApp } from "@/server/compartido/errores";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { cerrarSesion, iniciarSesion, registrar } from "@/server/auth/servicio";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { POST as registro } from "./registro/route";

vi.mock("@/server/auth/servicio", () => ({
  iniciarSesion: vi.fn(),
  registrar: vi.fn(),
  cerrarSesion: vi.fn(),
  usuarioDeToken: vi.fn(),
}));

const contexto = { params: Promise.resolve({}) };
const expira = new Date("2030-01-01T00:00:00Z");
const lucia = { id: "u1", nombre: "Lucía Martín", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };

function post(url: string, cuerpo?: unknown, cookie?: string) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/auth/login", () => {
  it("con credenciales válidas responde 200 con el usuario y pone la cookie de sesión", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ usuario: lucia, token: "tok123", expira });
    const res = await login(post("/api/auth/login", { email: " Lucia@Demo.test ", contrasena: "demo1234" }), contexto);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ usuario: { nombre: "Lucía Martín", email: "lucia@demo.test", rol: "alumno" } });
    expect(res.headers.get("set-cookie")).toContain(`${COOKIE_SESION}=tok123`);
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    // El email llega al servicio limpio y en minúsculas.
    expect(iniciarSesion).toHaveBeenCalledWith({ email: "lucia@demo.test", contrasena: "demo1234" });
  });

  it("con credenciales incorrectas responde 401 sin cookie", async () => {
    vi.mocked(iniciarSesion).mockRejectedValue(new ErrorApp("NO_AUTENTICADO", "Email o contraseña incorrectos"));
    const res = await login(post("/api/auth/login", { email: "lucia@demo.test", contrasena: "mal" }), contexto);

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Email o contraseña incorrectos", codigo: "NO_AUTENTICADO" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("con un email no válido o sin contraseña responde 400 y no llama al servicio", async () => {
    const res = await login(post("/api/auth/login", { email: "no-es-email", contrasena: "" }), contexto);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ codigo: "DATOS_INVALIDOS" });
    expect(iniciarSesion).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/registro", () => {
  it("crea la cuenta, responde 201 con el usuario y pone la cookie de sesión", async () => {
    vi.mocked(registrar).mockResolvedValue({ usuario: { ...lucia, nombre: "Nuevo" }, token: "tok456", expira });
    const res = await registro(
      post("/api/auth/registro", { nombre: "  Nuevo  ", email: "NUEVO@demo.test", contrasena: "segura123" }),
      contexto,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ usuario: { nombre: "Nuevo", email: "lucia@demo.test", rol: "alumno" } });
    expect(res.headers.get("set-cookie")).toContain(`${COOKIE_SESION}=tok456`);
    expect(registrar).toHaveBeenCalledWith({ nombre: "Nuevo", email: "nuevo@demo.test", contrasena: "segura123" });
  });

  it("con una contraseña de menos de 8 caracteres responde 400 y no llama al servicio", async () => {
    const res = await registro(post("/api/auth/registro", { nombre: "Nuevo", email: "nuevo@demo.test", contrasena: "corta" }), contexto);
    expect(res.status).toBe(400);
    expect(registrar).not.toHaveBeenCalled();
  });

  it("con un email que ya existe responde 409", async () => {
    vi.mocked(registrar).mockRejectedValue(new ErrorApp("CONFLICTO", "Ya hay una cuenta con ese email"));
    const res = await registro(
      post("/api/auth/registro", { nombre: "Nuevo", email: "lucia@demo.test", contrasena: "segura123" }),
      contexto,
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "Ya hay una cuenta con ese email", codigo: "CONFLICTO" });
  });
});

describe("POST /api/auth/logout", () => {
  it("borra la sesión del token de la cookie y borra la cookie", async () => {
    const res = await logout(post("/api/auth/logout", undefined, `${COOKIE_SESION}=tok123`), contexto);
    expect(res.status).toBe(204);
    expect(cerrarSesion).toHaveBeenCalledWith("tok123");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("sin sesión también responde 204 y borra la cookie", async () => {
    const res = await logout(post("/api/auth/logout"), contexto);
    expect(res.status).toBe(204);
    expect(cerrarSesion).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
