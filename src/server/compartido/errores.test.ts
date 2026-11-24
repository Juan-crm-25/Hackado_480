import { describe, expect, it } from "vitest";
import {
  conflicto,
  datosInvalidos,
  ErrorApp,
  errorIa,
  limiteSuperado,
  noAutenticado,
  noEncontrado,
  prohibido,
  STATUS_POR_CODIGO,
  type CodigoError,
} from "./errores";

describe("STATUS_POR_CODIGO", () => {
  it.each<[CodigoError, number]>([
    ["NO_AUTENTICADO", 401],
    ["PROHIBIDO", 403],
    ["NO_ENCONTRADO", 404],
    ["DATOS_INVALIDOS", 400],
    ["CONFLICTO", 409],
    ["LIMITE_SUPERADO", 429],
    ["ERROR_IA", 502],
  ])("%s → %i", (codigo, status) => {
    expect(STATUS_POR_CODIGO[codigo]).toBe(status);
    expect(new ErrorApp(codigo, "x").status).toBe(status);
  });

  it("solo tiene los siete códigos documentados", () => {
    expect(Object.keys(STATUS_POR_CODIGO)).toHaveLength(7);
  });
});

describe("ErrorApp", () => {
  it("es un Error con código, mensaje y detalles", () => {
    const error = new ErrorApp("CONFLICTO", "Ya existe", { campo: "email" });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ErrorApp");
    expect(error.message).toBe("Ya existe");
    expect(error.codigo).toBe("CONFLICTO");
    expect(error.detalles).toEqual({ campo: "email" });
  });
});

describe("fábricas", () => {
  it.each([
    [noAutenticado, "NO_AUTENTICADO"],
    [prohibido, "PROHIBIDO"],
    [noEncontrado, "NO_ENCONTRADO"],
    [conflicto, "CONFLICTO"],
    [limiteSuperado, "LIMITE_SUPERADO"],
    [errorIa, "ERROR_IA"],
  ] as const)("%o crea un ErrorApp con su código y un mensaje por defecto", (fabrica, codigo) => {
    const error = fabrica();
    expect(error).toBeInstanceOf(ErrorApp);
    expect(error.codigo).toBe(codigo);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it("aceptan un mensaje propio", () => {
    expect(noEncontrado("El curso no existe").message).toBe("El curso no existe");
  });

  it("datosInvalidos lleva los detalles", () => {
    const error = datosInvalidos({ email: ["Obligatorio"] });
    expect(error.codigo).toBe("DATOS_INVALIDOS");
    expect(error.detalles).toEqual({ email: ["Obligatorio"] });
  });
});
