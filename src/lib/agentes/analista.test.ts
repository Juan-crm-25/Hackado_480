import { describe, expect, it, vi } from "vitest";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { ErrorAnalista, resumirDudas, type EntradaAnalista } from "./analista";

const entrada: EntradaAnalista = {
  curso: "Introducción al desarrollo web",
  fallados: [{ concepto: "Selectores y especificidad", modulo: "CSS", porcentajeFallo: 0.6 }],
  dudas: [
    {
      modulo: "CSS",
      preguntas: [
        { texto: "No entiendo por qué mi clase no se aplica", veces: 6 },
        { texto: "¿Un id gana a una clase?", veces: 4 },
      ],
    },
    { modulo: "HTML", preguntas: [{ texto: "¿Para qué sirve el <head>?", veces: 1 }] },
  ],
};

const respuesta = (resumen: string) => ({ texto: JSON.stringify({ resumen }), simulado: false });
const RESUMEN = "La mayoría de dudas son de especificidad: por qué una clase no se aplica. Conviene repasarlo en clase con un ejemplo.";

describe("instrucciones del analista", () => {
  it("se leen de agents/analista-radar.md y tienen todas las variables", () => {
    expect(() => rellenar(leerInstrucciones("analista-radar"), { curso: "C", fallados: "-" })).not.toThrow();
  });
});

describe("resumirDudas", () => {
  it("envía al modelo las dudas agrupadas y los conceptos fallados, y devuelve el resumen", async () => {
    const completar = vi.fn().mockResolvedValue(respuesta(RESUMEN));
    expect(await resumirDudas(entrada, { completar })).toEqual({ resumen: RESUMEN });

    const op = completar.mock.calls[0][0];
    expect(op.modelo).toBe("tutor");
    expect(op.formatoJson).toBe(true);
    const [sistema, usuario] = op.mensajes.map((m: { contenido: string }) => m.contenido);
    expect(sistema).toContain("«Introducción al desarrollo web»");
    expect(sistema).toContain("- Selectores y especificidad (CSS): 60 % de fallos");
    // Las dudas (texto de alumnos) van en el mensaje del usuario, nunca en las instrucciones.
    expect(sistema).not.toContain("No entiendo por qué");
    expect(usuario).toContain("## CSS");
    expect(usuario).toContain("- No entiendo por qué mi clase no se aplica · 6");
    expect(usuario).toContain("- ¿Para qué sirve el <head>? · 1");
  });

  it("no envía nada que identifique a un alumno: solo textos y números", async () => {
    const completar = vi.fn().mockResolvedValue(respuesta(RESUMEN));
    await resumirDudas(entrada, { completar });
    const enviado = JSON.stringify(completar.mock.calls[0][0].mensajes);
    expect(enviado).not.toMatch(/alumno_|usuarioId|@/);
  });

  it("sin dudas no llama a la IA", async () => {
    const completar = vi.fn();
    const r = await resumirDudas({ ...entrada, dudas: [] }, { completar });
    expect(completar).not.toHaveBeenCalled();
    expect(r.resumen).toMatch(/todavía no han hecho preguntas/i);
  });

  it("limita las preguntas por módulo para acotar el coste", async () => {
    const completar = vi.fn().mockResolvedValue(respuesta(RESUMEN));
    const muchas = Array.from({ length: 100 }, (_, i) => ({ texto: `Pregunta ${i}`, veces: 1 }));
    await resumirDudas({ ...entrada, dudas: [{ modulo: "CSS", preguntas: muchas }] }, { completar });
    const usuario = completar.mock.calls[0][0].mensajes[1].contenido as string;
    expect(usuario).toContain("Pregunta 39");
    expect(usuario).not.toContain("Pregunta 40");
  });

  it("rechaza respuestas vacías, demasiado largas o que no son JSON", async () => {
    for (const texto of [JSON.stringify({ resumen: "corto" }), JSON.stringify({ resumen: "x".repeat(1300) }), "no es json"]) {
      const completar = vi.fn().mockResolvedValue({ texto, simulado: false });
      await expect(resumirDudas(entrada, { completar })).rejects.toBeInstanceOf(ErrorAnalista);
    }
  });

  it("en modo simulado lo dice, sin inventar un resumen", async () => {
    const completar = vi.fn().mockResolvedValue({ texto: "{}", simulado: true });
    await expect(resumirDudas(entrada, { completar })).rejects.toThrow(/simulado/);
  });
});
