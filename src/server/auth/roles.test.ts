import { describe, expect, it } from "vitest";
import { cumpleAcceso, type NivelAcceso, type RolUsuario, type UsuarioSesion } from "./roles";

function usuarioCon(rol: RolUsuario): UsuarioSesion {
  return { id: "u1", nombre: "Ana", email: "ana@example.com", rol, emailVerificado: true };
}

const niveles: NivelAcceso[] = ["publico", "usuario", "alumno", "profesor", "admin"];

// Fila: quién pide. Columnas: publico, usuario, alumno, profesor, admin.
const matriz: [string, UsuarioSesion | null, boolean[]][] = [
  ["visitante", null, [true, false, false, false, false]],
  ["alumno", usuarioCon("alumno"), [true, true, true, false, false]],
  ["profesor", usuarioCon("profesor"), [true, true, true, true, false]],
  ["admin", usuarioCon("admin"), [true, true, true, true, true]],
];

describe("cumpleAcceso", () => {
  for (const [quien, usuario, esperados] of matriz) {
    niveles.forEach((nivel, i) => {
      it(`${quien} ${esperados[i] ? "pasa" : "no pasa"} el nivel ${nivel}`, () => {
        expect(cumpleAcceso(usuario, nivel)).toBe(esperados[i]);
      });
    });
  }
});
