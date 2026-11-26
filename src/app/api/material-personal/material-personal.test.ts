import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { prohibido } from "@/server/compartido/errores";
import { crearMaterialPersonal, listarMiMaterialPersonal } from "@/server/material/servicio";
import { GET, POST } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/material/servicio", () => ({ crearMaterialPersonal: vi.fn(), listarMiMaterialPersonal: vi.fn() }));

const carmen = { id: "u-carmen", nombre: "Carmen López", email: "carmen@demo.test", rol: "alumno" as const, emailVerificado: true };
const contexto = { params: Promise.resolve({}) };
const cabeceras = (conSesion = true) => ({ "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) });
const crear = (cuerpo: unknown, conSesion = true) =>
  POST(new Request("http://localhost/api/material-personal", { method: "POST", headers: cabeceras(conSesion), body: JSON.stringify(cuerpo) }), contexto);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(carmen);
});

describe("/api/material-personal", () => {
  it("GET lista el material del usuario de la SESIÓN, aunque la URL traiga otro alumnoId", async () => {
    vi.mocked(listarMiMaterialPersonal).mockResolvedValue([]);
    const res = await GET(new Request("http://localhost/api/material-personal?alumnoId=a1&moduloId=m2-css", { headers: cabeceras() }), contexto);
    expect(res.status).toBe(200);
    expect(listarMiMaterialPersonal).toHaveBeenCalledWith(carmen, "m2-css");
  });

  it("POST crea el material del usuario de la SESIÓN e ignora el alumnoId del cuerpo", async () => {
    vi.mocked(crearMaterialPersonal).mockResolvedValue({ material: {} as never, consultasRestantes: 29 });
    const res = await crear({ alumnoId: "a1", moduloId: "m2-css", tipo: "tarjetas", nivel: "basico" });
    expect(res.status).toBe(200);
    expect(crearMaterialPersonal).toHaveBeenCalledWith(carmen, { moduloId: "m2-css", tipo: "tarjetas", nivel: "basico" });
  });

  it("sin sesión: 401; tipo o enfoque no válidos: 400; sin el curso: 403", async () => {
    expect((await crear({ moduloId: "m2-css", tipo: "tarjetas" }, false)).status).toBe(401);
    expect((await crear({ moduloId: "m2-css", tipo: "poema" })).status).toBe(400);
    expect((await crear({ moduloId: "m2-css", tipo: "tarjetas", enfoque: "x".repeat(201) })).status).toBe(400);
    expect(crearMaterialPersonal).not.toHaveBeenCalled();
    vi.mocked(crearMaterialPersonal).mockRejectedValue(prohibido());
    expect((await crear({ moduloId: "m2-css", tipo: "tarjetas" })).status).toBe(403);
  });
});
