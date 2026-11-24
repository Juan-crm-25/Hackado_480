import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import type { RolUsuario, UsuarioSesion } from "@/server/auth/roles";
import { ErrorApp } from "../errores";
import { crearRuta } from "./ruta";

function usuarioCon(rol: RolUsuario): UsuarioSesion {
  return { id: "u1", nombre: "Ana", email: "ana@example.com", rol, emailVerificado: true };
}

function rutaCon(usuario: UsuarioSesion | null) {
  return crearRuta({ obtenerSesion: async () => usuario });
}

function contexto(params: Record<string, string | string[]> = {}) {
  return { params: Promise.resolve(params) };
}

const URL_BASE = "http://localhost/api/prueba";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ruta: acceso", () => {
  it("publico sin sesión → 200 con el JSON del manejador y usuario null", async () => {
    const GET = rutaCon(null)({ acceso: "publico" }, ({ usuario }) => ({ ok: true, usuario }));
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, usuario: null });
  });

  it("usuario sin sesión → 401 NO_AUTENTICADO y no llama al manejador", async () => {
    const manejador = vi.fn();
    const GET = rutaCon(null)({ acceso: "usuario" }, manejador);
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ codigo: "NO_AUTENTICADO", error: expect.any(String) });
    expect(manejador).not.toHaveBeenCalled();
  });

  it("alumno pidiendo profesor → 403 PROHIBIDO", async () => {
    const manejador = vi.fn();
    const GET = rutaCon(usuarioCon("alumno"))({ acceso: "profesor" }, manejador);
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ codigo: "PROHIBIDO" });
    expect(manejador).not.toHaveBeenCalled();
  });

  it("admin pasa el nivel profesor y recibe su usuario", async () => {
    const admin = usuarioCon("admin");
    const GET = rutaCon(admin)({ acceso: "profesor" }, ({ usuario }) => ({ id: usuario.id, rol: usuario.rol }));
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "u1", rol: "admin" });
  });

  it("pasa la Request al lector de sesión", async () => {
    const obtenerSesion = vi.fn(async () => null);
    const request = new Request(URL_BASE);
    await crearRuta({ obtenerSesion })({ acceso: "publico" }, () => ({}))(request, contexto());
    expect(obtenerSesion).toHaveBeenCalledWith(request);
  });
});

describe("ruta: params", () => {
  const esquema = z.object({ id: z.string().regex(/^\d+$/).transform(Number) });

  it("resuelve la Promise de params y la valida", async () => {
    const GET = rutaCon(null)({ acceso: "publico", params: esquema }, ({ params }) => ({ doble: params.id * 2 }));
    const res = await GET(new Request(URL_BASE), contexto({ id: "21" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ doble: 42 });
  });

  it("params no válidos → 400 DATOS_INVALIDOS con detalles del campo", async () => {
    const manejador = vi.fn();
    const GET = rutaCon(null)({ acceso: "publico", params: esquema }, manejador);
    const res = await GET(new Request(URL_BASE), contexto({ id: "abc" }));
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.codigo).toBe("DATOS_INVALIDOS");
    expect(cuerpo.detalles.fieldErrors.id).toEqual([expect.any(String)]);
    expect(manejador).not.toHaveBeenCalled();
  });
});

describe("ruta: query", () => {
  const esquema = z.object({ categoria: z.string().min(1), pagina: z.coerce.number().int().positive().default(1) });

  it("valida los searchParams de la URL", async () => {
    const GET = rutaCon(null)({ acceso: "publico", query: esquema }, ({ query }) => query);
    const res = await GET(new Request(`${URL_BASE}?categoria=ia&pagina=3`), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ categoria: "ia", pagina: 3 });
  });

  it("query no válida → 400 con detalles", async () => {
    const GET = rutaCon(null)({ acceso: "publico", query: esquema }, ({ query }) => query);
    const res = await GET(new Request(`${URL_BASE}?pagina=-1`), contexto());
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.codigo).toBe("DATOS_INVALIDOS");
    expect(Object.keys(cuerpo.detalles.fieldErrors).sort()).toEqual(["categoria", "pagina"]);
  });
});

describe("ruta: cuerpo", () => {
  const esquema = z.object({ titulo: z.string().min(3), texto: z.string() });

  function post(cuerpo: string) {
    return new Request(URL_BASE, { method: "POST", body: cuerpo, headers: { "content-type": "application/json" } });
  }

  it("valida el JSON y lo pasa tipado al manejador", async () => {
    const POST = rutaCon(usuarioCon("alumno"))({ acceso: "usuario", cuerpo: esquema }, ({ cuerpo }) => ({
      titulo: cuerpo.titulo,
    }));
    const res = await POST(post(JSON.stringify({ titulo: "Hola", texto: "x" })), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ titulo: "Hola" });
  });

  it("JSON mal formado → 400 DATOS_INVALIDOS", async () => {
    const manejador = vi.fn();
    const POST = rutaCon(null)({ acceso: "publico", cuerpo: esquema }, manejador);
    const res = await POST(post("{no es json"), contexto());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ codigo: "DATOS_INVALIDOS" });
    expect(manejador).not.toHaveBeenCalled();
  });

  it("cuerpo que no cumple el esquema → 400 con detalles por campo", async () => {
    const POST = rutaCon(null)({ acceso: "publico", cuerpo: esquema }, () => ({}));
    const res = await POST(post(JSON.stringify({ titulo: "ab" })), contexto());
    expect(res.status).toBe(400);
    const cuerpo = await res.json();
    expect(cuerpo.codigo).toBe("DATOS_INVALIDOS");
    expect(cuerpo.detalles.fieldErrors).toEqual({ titulo: [expect.any(String)], texto: [expect.any(String)] });
  });

  it("sin esquema de cuerpo no lee el cuerpo", async () => {
    const POST = rutaCon(null)({ acceso: "publico" }, ({ cuerpo }) => ({ cuerpo: cuerpo ?? "sin cuerpo" }));
    const res = await POST(post("{no es json"), contexto());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cuerpo: "sin cuerpo" });
  });
});

describe("ruta: tipos inferidos", () => {
  it("usuario es nullable solo en publico y los esquemas tipan params, query y cuerpo", () => {
    const ruta = rutaCon(null);
    ruta({ acceso: "publico" }, ({ usuario, params, query, cuerpo }) => {
      expectTypeOf(usuario).toEqualTypeOf<UsuarioSesion | null>();
      expectTypeOf(params).toEqualTypeOf<undefined>();
      expectTypeOf(query).toEqualTypeOf<undefined>();
      expectTypeOf(cuerpo).toEqualTypeOf<undefined>();
    });
    ruta(
      {
        acceso: "alumno",
        params: z.object({ id: z.string() }),
        query: z.object({ n: z.coerce.number() }),
        cuerpo: z.object({ texto: z.string() }),
      },
      ({ usuario, params, query, cuerpo }) => {
        expectTypeOf(usuario).toEqualTypeOf<UsuarioSesion>();
        expectTypeOf(params).toEqualTypeOf<{ id: string }>();
        expectTypeOf(query).toEqualTypeOf<{ n: number }>();
        expectTypeOf(cuerpo).toEqualTypeOf<{ texto: string }>();
      },
    );
  });
});

describe("ruta: respuesta y errores", () => {
  it("una Response del manejador se devuelve tal cual", async () => {
    const propia = new Response("texto", { status: 201, headers: { "X-Cache": "HIT" } });
    const GET = rutaCon(null)({ acceso: "publico" }, () => propia);
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res).toBe(propia);
  });

  it("un manejador sin resultado → 204 sin cuerpo", async () => {
    const GET = rutaCon(null)({ acceso: "publico" }, () => undefined);
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("ErrorApp(CONFLICTO) → 409 con { error, codigo, detalles }", async () => {
    const GET = rutaCon(null)({ acceso: "publico" }, async () => {
      throw new ErrorApp("CONFLICTO", "Ya estás matriculado", { cursoId: "c1" });
    });
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Ya estás matriculado",
      codigo: "CONFLICTO",
      detalles: { cursoId: "c1" },
    });
  });

  it("un Error cualquiera → 500 genérico sin filtrar el mensaje", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const GET = rutaCon(null)({ acceso: "publico" }, () => {
      throw new Error("secreto");
    });
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(500);
    const texto = await res.text();
    expect(texto).not.toContain("secreto");
    expect(JSON.parse(texto)).toEqual({ error: "Error interno", codigo: "ERROR_INTERNO" });
    expect(consola).toHaveBeenCalled();
  });

  it("si falla la lectura de la sesión → 500 genérico", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const GET = crearRuta({
      obtenerSesion: async () => {
        throw new Error("bbdd caída");
      },
    })({ acceso: "publico" }, () => ({}));
    const res = await GET(new Request(URL_BASE), contexto());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("bbdd");
  });
});
