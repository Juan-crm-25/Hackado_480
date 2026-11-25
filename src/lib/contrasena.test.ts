import { describe, expect, it } from "vitest";
import { cifrarContrasena, comprobarContrasena } from "./contrasena";

describe("contraseñas (scrypt)", () => {
  it("no guarda la contraseña en claro y la comprueba", async () => {
    const guardada = await cifrarContrasena("demo1234");
    expect(guardada).not.toContain("demo1234");
    expect(guardada.startsWith("scrypt$")).toBe(true);
    expect(await comprobarContrasena("demo1234", guardada)).toBe(true);
  });

  it("rechaza una contraseña distinta", async () => {
    const guardada = await cifrarContrasena("demo1234");
    expect(await comprobarContrasena("demo12345", guardada)).toBe(false);
    expect(await comprobarContrasena("", guardada)).toBe(false);
  });

  it("usa una sal distinta cada vez", async () => {
    expect(await cifrarContrasena("demo1234")).not.toBe(await cifrarContrasena("demo1234"));
  });

  it("devuelve false con un valor guardado mal formado o vacío", async () => {
    expect(await comprobarContrasena("demo1234", "")).toBe(false);
    expect(await comprobarContrasena("demo1234", null)).toBe(false);
    expect(await comprobarContrasena("demo1234", "scrypt$zz$zz")).toBe(false);
    expect(await comprobarContrasena("demo1234", "bcrypt$abc$def")).toBe(false);
  });
});
