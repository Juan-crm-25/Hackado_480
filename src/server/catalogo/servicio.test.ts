import { describe, expect, it, vi } from "vitest";
import type { CursoCatalogo } from "@/lib/catalogo-bd";
import type { Db } from "@/lib/db/client";
import { buscarModulo, cargarCursoPorSlug, cargarCursoPrincipal, cargarCursoPublico, cargarCursosPublicados } from "./servicio";

const curso: CursoCatalogo = {
  id: "intro",
  titulo: "Curso",
  descripcion: "",
  categoria: "Programación",
  modulos: [{ id: "m1-html", titulo: "HTML", descripcion: "", ordenSugerido: 1, conceptos: [], clases: [] }],
};

describe("cargarCursoPrincipal", () => {
  it("si la BBDD falla devuelve un error en lugar de romper la página", async () => {
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    const dbRota = {
      select: () => {
        throw new Error("ECONNREFUSED");
      },
    } as unknown as Db;
    expect(await cargarCursoPrincipal(() => dbRota)).toEqual({ estado: "error" });
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it("si getDb no puede crearse (sin DATABASE_URL) también devuelve un error", async () => {
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    const sinUrl = () => {
      throw new Error("Falta DATABASE_URL");
    };
    expect(await cargarCursoPrincipal(sinUrl)).toEqual({ estado: "error" });
    aviso.mockRestore();
  });
});

describe("cargarCursoPorSlug", () => {
  it("si la BBDD falla devuelve un error en lugar de romper la página", async () => {
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    const sinUrl = () => {
      throw new Error("Falta DATABASE_URL");
    };
    expect(await cargarCursoPorSlug("python-desde-cero", sinUrl)).toEqual({ estado: "error" });
    aviso.mockRestore();
  });
});

describe("cargarCursosPublicados y cargarCursoPublico", () => {
  const dbRota = {
    select: () => {
      throw new Error("ECONNREFUSED");
    },
  } as unknown as Db;

  it("si la BBDD falla devuelven un error en lugar de romper la página", async () => {
    const aviso = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await cargarCursosPublicados(() => dbRota)).toEqual({ estado: "error" });
    expect(await cargarCursoPublico("x", () => dbRota)).toEqual({ estado: "error" });
    const sinUrl = () => {
      throw new Error("Falta DATABASE_URL");
    };
    expect(await cargarCursosPublicados(sinUrl)).toEqual({ estado: "error" });
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });
});

describe("buscarModulo", () => {
  it("encuentra el módulo por su id (slug) o devuelve undefined", () => {
    expect(buscarModulo(curso, "m1-html")?.titulo).toBe("HTML");
    expect(buscarModulo(curso, "nada")).toBeUndefined();
  });
});
