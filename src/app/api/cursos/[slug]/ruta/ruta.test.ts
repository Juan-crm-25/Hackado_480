import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { guardarRuta, obtenerRuta } from "@/server/matriculas/servicio";
import { GET, PUT } from "./route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/matriculas/servicio", () => ({ obtenerRuta: vi.fn(), guardarRuta: vi.fn() }));

const contexto = { params: Promise.resolve({ slug: "desarrollo-web" }) };
const lucia = { id: "u1", nombre: "Lucía", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };
const URL_RUTA = "http://localhost/api/cursos/desarrollo-web/ruta";

function peticion(metodo: "GET" | "PUT", cuerpo?: unknown, conSesion = true) {
  return new Request(URL_RUTA, {
    method: metodo,
    headers: { "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
});

describe("/api/cursos/[slug]/ruta", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET(peticion("GET", undefined, false), contexto)).status).toBe(401);
    expect((await PUT(peticion("PUT", { valoraciones: {} }, false), contexto)).status).toBe(401);
    expect(guardarRuta).not.toHaveBeenCalled();
  });

  it("GET devuelve la ruta del alumno en ese curso", async () => {
    vi.mocked(obtenerRuta).mockResolvedValue({ personalizada: false } as never);
    const res = await GET(peticion("GET"), contexto);
    expect(res.status).toBe(200);
    expect(obtenerRuta).toHaveBeenCalledWith(lucia, "desarrollo-web");
  });

  it("PUT guarda las valoraciones del alumno", async () => {
    vi.mocked(guardarRuta).mockResolvedValue({ principal: "m2-css" } as never);
    const valoraciones = { "m2-css": "mucho", "m1-html": "sabe" };
    const res = await PUT(peticion("PUT", { valoraciones }), contexto);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ principal: "m2-css" });
    expect(guardarRuta).toHaveBeenCalledWith(lucia, "desarrollo-web", { valoraciones });
  });

  it("PUT con una valoración que no existe responde 400 y no guarda", async () => {
    const res = await PUT(peticion("PUT", { valoraciones: { "m2-css": "muchisimo" } }), contexto);
    expect(res.status).toBe(400);
    expect(guardarRuta).not.toHaveBeenCalled();
  });
});
