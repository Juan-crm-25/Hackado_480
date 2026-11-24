import { describe, expect, it } from "vitest";
import { leerRespuesta, mensajeDeError } from "./peticiones";

describe("mensajeDeError", () => {
  it("usa el mensaje del error", () => {
    expect(mensajeDeError(new Error("Has llegado al límite de hoy"))).toBe("Has llegado al límite de hoy");
  });

  it("traduce el fallo de red del navegador", () => {
    expect(mensajeDeError(new TypeError("Failed to fetch"))).toBe("Sin conexión. Inténtalo de nuevo.");
  });

  it("da un mensaje de conexión si no es un Error", () => {
    expect(mensajeDeError("algo")).toBe("Sin conexión. Inténtalo de nuevo.");
  });
});

describe("leerRespuesta", () => {
  const json = (cuerpo: unknown, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

  it("devuelve los datos si la respuesta es correcta", async () => {
    await expect(leerRespuesta<number[]>(json([1, 2]))).resolves.toEqual([1, 2]);
  });

  it("lanza el error de la API si lo trae", async () => {
    await expect(leerRespuesta(json({ error: "Módulo no encontrado" }, 404))).rejects.toThrow("Módulo no encontrado");
  });

  it("lanza un error genérico si la respuesta falla sin cuerpo JSON", async () => {
    await expect(leerRespuesta(new Response("<html>", { status: 500 }))).rejects.toThrow("Error inesperado");
  });
});
