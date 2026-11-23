import { afterEach, describe, expect, it, vi } from "vitest";
import { filtrarTexto, reidentificar, seudonimo } from "./privacidad";

describe("filtrarTexto", () => {
  it("quita emails", () => {
    const r = filtrarTexto("Escríbeme a lucia.martin@gmail.com si puedes");
    expect(r.texto).toBe("Escríbeme a [EMAIL] si puedes");
    expect(r.eliminados.email).toBe(1);
  });

  it("quita teléfonos españoles con y sin prefijo", () => {
    expect(filtrarTexto("Llámame al 612 345 678").texto).toBe("Llámame al [TELEFONO]");
    expect(filtrarTexto("o al +34 912-345-678").texto).toBe("o al [TELEFONO]");
    expect(filtrarTexto("móvil 699887766.").texto).toBe("móvil [TELEFONO].");
  });

  it("quita DNI y NIE", () => {
    expect(filtrarTexto("Mi DNI es 12345678Z").texto).toBe("Mi DNI es [DNI]");
    expect(filtrarTexto("NIE: X-1234567-L").texto).toBe("NIE: [DNI]");
  });

  it("quita IBAN y tarjetas", () => {
    expect(filtrarTexto("IBAN ES91 2100 0418 4502 0005 1332").texto).toBe("IBAN [IBAN]");
    expect(filtrarTexto("tarjeta 4111 1111 1111 1111").texto).toBe("tarjeta [TARJETA]");
  });

  it("quita nombres conocidos, completos o por partes, sin distinguir mayúsculas", () => {
    const r = filtrarTexto("Soy Lucía Martín. LUCÍA tiene dudas y Martín también", ["Lucía Martín"]);
    expect(r.texto).toBe("Soy [NOMBRE]. [NOMBRE] tiene dudas y [NOMBRE] también");
    expect(r.eliminados.nombre).toBe(3);
  });

  it("no quita palabras que solo contienen el nombre", () => {
    expect(filtrarTexto("Anabel y la ana-tomía", ["Ana"]).texto).toBe("Anabel y la [NOMBRE]-tomía");
    expect(filtrarTexto("Analizar el DOM", ["Ana"]).texto).toBe("Analizar el DOM");
  });

  it("no toca el contenido técnico normal", () => {
    const pregunta = "¿Por qué #enviar gana a .boton? Uso width: 100px y z-index: 10 en 2026";
    const r = filtrarTexto(pregunta, ["Lucía Martín"]);
    expect(r.texto).toBe(pregunta);
    expect(r.eliminados).toEqual({});
  });
});

describe("seudónimos", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("son estables, no revelan el id y cambian con la sal", () => {
    vi.stubEnv("AI_SEUDONIMO_SAL", "sal-a");
    const s = seudonimo("a1");
    expect(s).toMatch(/^alumno_[0-9a-f]{6}$/);
    expect(s).not.toContain("a1");
    expect(seudonimo("a1")).toBe(s);
    expect(seudonimo("a2")).not.toBe(s);

    vi.stubEnv("AI_SEUDONIMO_SAL", "sal-b");
    expect(seudonimo("a1")).not.toBe(s);
  });

  it("se pueden reidentificar en el servidor", () => {
    vi.stubEnv("AI_SEUDONIMO_SAL", "sal-a");
    expect(reidentificar(seudonimo("a2"), ["a1", "a2", "a3"])).toBe("a2");
    expect(reidentificar("alumno_000000", ["a1", "a2"])).toBeUndefined();
  });
});
