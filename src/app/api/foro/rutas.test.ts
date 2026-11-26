import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_SESION } from "@/server/auth/cookie";
import { usuarioDeToken } from "@/server/auth/servicio";
import { ErrorApp } from "@/server/compartido/errores";
import {
  crearComentario,
  crearTema,
  darPuntos,
  listarTemas,
  obtenerHilo,
  quitarPuntos,
  validarComoProfesor,
} from "@/server/foro/servicio";
import { obtenerPuntosDelAlumno } from "@/server/recompensas/servicio";
import * as rutaTemas from "../cursos/[slug]/modulos/[modulo]/temas/route";
import * as rutaTema from "../temas/[id]/route";
import * as rutaComentarios from "../temas/[id]/comentarios/route";
import * as rutaValidacion from "../comentarios/[id]/validacion/route";
import * as rutaPuntos from "./puntos/route";
import * as rutaMisPuntos from "../yo/puntos/route";

vi.mock("@/server/auth/servicio", () => ({ usuarioDeToken: vi.fn() }));
vi.mock("@/server/foro/servicio", () => ({
  listarTemas: vi.fn(),
  crearTema: vi.fn(),
  obtenerHilo: vi.fn(),
  crearComentario: vi.fn(),
  validarComoProfesor: vi.fn(),
  darPuntos: vi.fn(),
  quitarPuntos: vi.fn(),
}));
vi.mock("@/server/recompensas/servicio", () => ({ obtenerPuntosDelAlumno: vi.fn() }));

const lucia = { id: "u1", nombre: "Lucía", email: "lucia@demo.test", rol: "alumno" as const, emailVerificado: true };
const ID = "11111111-1111-4111-8111-111111111111";
const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

function peticion(metodo: string, cuerpo?: unknown, conSesion = true) {
  return new Request("http://localhost/api/x", {
    method: metodo,
    headers: { "content-type": "application/json", ...(conSesion ? { cookie: `${COOKIE_SESION}=tok` } : {}) },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usuarioDeToken).mockResolvedValue(lucia);
});

describe("GET/POST /api/cursos/[slug]/modulos/[modulo]/temas", () => {
  const params = { slug: "desarrollo-web", modulo: "m2-css" };

  it("sin sesión: 401", async () => {
    const res = await rutaTemas.GET(peticion("GET", undefined, false), ctx(params));
    expect(res.status).toBe(401);
    expect(listarTemas).not.toHaveBeenCalled();
  });

  it("lista los temas del módulo", async () => {
    vi.mocked(listarTemas).mockResolvedValue([]);
    const res = await rutaTemas.GET(peticion("GET"), ctx(params));
    expect(res.status).toBe(200);
    expect(listarTemas).toHaveBeenCalledWith(lucia, "desarrollo-web", "m2-css");
  });

  it("crea un tema; título corto: 400", async () => {
    vi.mocked(crearTema).mockResolvedValue({ id: ID } as never);
    const res = await rutaTemas.POST(peticion("POST", { titulo: "  Flexbox  ", cuerpo: "¿Cuál uso?" }), ctx(params));
    expect(res.status).toBe(201);
    expect(crearTema).toHaveBeenCalledWith(lucia, "desarrollo-web", "m2-css", { titulo: "Flexbox", cuerpo: "¿Cuál uso?" });
    expect((await rutaTemas.POST(peticion("POST", { titulo: "ab", cuerpo: "x" }), ctx(params))).status).toBe(400);
  });

  it("sin el curso: 403", async () => {
    vi.mocked(listarTemas).mockRejectedValue(new ErrorApp("PROHIBIDO", "No tienes este curso"));
    expect((await rutaTemas.GET(peticion("GET"), ctx(params))).status).toBe(403);
  });

  it("declara maxDuration para after()", () => {
    expect(rutaTema.maxDuration).toBe(30);
    expect(rutaComentarios.maxDuration).toBe(30);
  });
});

describe("GET /api/temas/[id] y POST /api/temas/[id]/comentarios", () => {
  it("tema que no existe: 404", async () => {
    vi.mocked(obtenerHilo).mockRejectedValue(new ErrorApp("NO_ENCONTRADO", "No existe ese tema"));
    expect((await rutaTema.GET(peticion("GET"), ctx({ id: ID }))).status).toBe(404);
  });

  it("comenta con respuestaAId opcional; respuestaAId de otro tema: 400; cuerpo vacío: 400", async () => {
    vi.mocked(crearComentario).mockResolvedValue({ id: ID } as never);
    const res = await rutaComentarios.POST(peticion("POST", { cuerpo: "Gana el id", respuestaAId: ID }), ctx({ id: ID }));
    expect(res.status).toBe(201);
    expect(crearComentario).toHaveBeenCalledWith(lucia, ID, { cuerpo: "Gana el id", respuestaAId: ID });

    vi.mocked(crearComentario).mockRejectedValue(new ErrorApp("DATOS_INVALIDOS", "Ese comentario no es de este tema"));
    expect((await rutaComentarios.POST(peticion("POST", { cuerpo: "x", respuestaAId: ID }), ctx({ id: ID }))).status).toBe(400);
    expect((await rutaComentarios.POST(peticion("POST", { cuerpo: "   " }), ctx({ id: ID }))).status).toBe(400);
  });

  it("responder a un comentario de Sensei: 400 con el mensaje del servicio (S11)", async () => {
    vi.mocked(crearComentario).mockRejectedValue(new ErrorApp("DATOS_INVALIDOS", "No se puede responder a Sensei"));
    const res = await rutaComentarios.POST(peticion("POST", { cuerpo: "¡Gracias!", respuestaAId: ID }), ctx({ id: ID }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "No se puede responder a Sensei", codigo: "DATOS_INVALIDOS" });
  });
});

describe("PUT /api/comentarios/[id]/validacion", () => {
  it("valida con una valoración permitida; 'pendiente' no se acepta", async () => {
    vi.mocked(validarComoProfesor).mockResolvedValue({ id: ID } as never);
    expect((await rutaValidacion.PUT(peticion("PUT", { validacion: "correcta" }), ctx({ id: ID }))).status).toBe(200);
    expect(validarComoProfesor).toHaveBeenCalledWith(lucia, ID, "correcta");
    expect((await rutaValidacion.PUT(peticion("PUT", { validacion: "pendiente" }), ctx({ id: ID }))).status).toBe(400);
  });

  it("si no es el profesor del curso: 403", async () => {
    vi.mocked(validarComoProfesor).mockRejectedValue(new ErrorApp("PROHIBIDO", "Solo el profesor"));
    expect((await rutaValidacion.PUT(peticion("PUT", { validacion: "correcta" }), ctx({ id: ID }))).status).toBe(403);
  });
});

describe("PUT/DELETE /api/foro/puntos", () => {
  it("da puntos a un comentario; +2 o los dos destinos a la vez: 400", async () => {
    vi.mocked(darPuntos).mockResolvedValue({ puntos: 3, motivo: "buena_conducta" });
    const res = await rutaPuntos.PUT(peticion("PUT", { comentarioId: ID, puntos: 3, motivo: "buena_conducta" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ puntos: 3, motivo: "buena_conducta" });
    expect(darPuntos).toHaveBeenCalledWith(lucia, { comentarioId: ID, puntos: 3, motivo: "buena_conducta" });
    expect((await rutaPuntos.PUT(peticion("PUT", { comentarioId: ID, puntos: 2, motivo: "buena_conducta" }), ctx())).status).toBe(400);
    expect((await rutaPuntos.PUT(peticion("PUT", { temaId: ID, comentarioId: ID, puntos: 1, motivo: "buena_pregunta" }), ctx())).status).toBe(400);
    expect((await rutaPuntos.PUT(peticion("PUT", { puntos: 1, motivo: "buena_pregunta" }), ctx())).status).toBe(400);
  });

  it("quita los puntos: 204; si no es el profesor: 403", async () => {
    vi.mocked(quitarPuntos).mockResolvedValue(undefined);
    const res = await rutaPuntos.DELETE(peticion("DELETE", { temaId: ID }), ctx());
    expect(res.status).toBe(204);
    expect(quitarPuntos).toHaveBeenCalledWith(lucia, { temaId: ID });
    vi.mocked(quitarPuntos).mockRejectedValue(new ErrorApp("PROHIBIDO", "Solo el profesor"));
    expect((await rutaPuntos.DELETE(peticion("DELETE", { temaId: ID }), ctx())).status).toBe(403);
  });
});

describe("GET /api/yo/puntos", () => {
  it("sin sesión: 401; con sesión, los puntos del usuario de la sesión", async () => {
    expect((await rutaMisPuntos.GET(peticion("GET", undefined, false), ctx())).status).toBe(401);
    vi.mocked(obtenerPuntosDelAlumno).mockResolvedValue({ total: 15, respuestas: 10, profesor: 5 });
    const res = await rutaMisPuntos.GET(peticion("GET"), ctx());
    expect(await res.json()).toEqual({ total: 15, respuestas: 10, profesor: 5 });
    expect(obtenerPuntosDelAlumno).toHaveBeenCalledWith("u1");
  });
});
