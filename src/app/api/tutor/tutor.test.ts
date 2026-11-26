import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorIA } from "@/lib/ai/cliente";
import { consumirConsulta } from "@/lib/ai/limite";
import { preguntarAlTutor } from "@/lib/agentes/tutor";
import { buscarModulo, buscarUsuarioDemo } from "@/server/matriculas/demo";
import { registrarIntercambio } from "@/server/tutor/servicio";
import { POST } from "./route";

vi.mock("@/lib/ai/limite", () => ({ consumirConsulta: vi.fn() }));
vi.mock("@/lib/agentes/tutor", () => ({ preguntarAlTutor: vi.fn() }));
vi.mock("@/server/matriculas/demo", () => ({
  buscarUsuarioDemo: vi.fn(),
  buscarModulo: vi.fn(),
  MENSAJE_SIN_SEED: "Ejecuta «npm run db:seed».",
}));
vi.mock("@/server/tutor/servicio", () => ({ registrarIntercambio: vi.fn() }));

const respuestaTutor = { rol: "tutor" as const, texto: "Gana el id", fuentes: [{ videoId: "v04", segundo: 125 }] };

function pregunta(mensaje = "¿Por qué gana #enviar?") {
  return new Request("http://localhost/api/tutor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ alumnoId: "a1", moduloId: "m2-css", mensaje }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buscarUsuarioDemo).mockResolvedValue({ id: "u-lucia", nombre: "Lucía Martín", email: "lucia@demo.test" });
  vi.mocked(buscarModulo).mockResolvedValue({ id: "mod-css", slug: "m2-css" });
  vi.mocked(consumirConsulta).mockResolvedValue({ permitido: true, restantes: 29 });
  vi.mocked(preguntarAlTutor).mockResolvedValue({ mensaje: respuestaTutor, fueraDeTemario: false, simulado: false });
  vi.mocked(registrarIntercambio).mockResolvedValue({ conversacionId: "c1" });
});

describe("POST /api/tutor guarda la conversación (#5)", () => {
  it("guarda la pregunta y la respuesta con los ids de la BBDD y el nombre del alumno para ocultarlo", async () => {
    const res = await POST(pregunta());

    expect(res.status).toBe(200);
    expect((await res.json()).mensaje).toEqual(respuestaTutor);
    expect(registrarIntercambio).toHaveBeenCalledWith({
      usuarioId: "u-lucia",
      moduloId: "mod-css",
      pregunta: "¿Por qué gana #enviar?",
      nombresOcultos: ["Lucía Martín"],
      respuesta: respuestaTutor,
    });
  });

  it("no guarda nada en modo simulado (sin IA no hay conversación real)", async () => {
    vi.mocked(preguntarAlTutor).mockResolvedValue({ mensaje: respuestaTutor, fueraDeTemario: false, simulado: true });
    expect((await POST(pregunta())).status).toBe(200);
    expect(registrarIntercambio).not.toHaveBeenCalled();
  });

  it("no guarda nada si la IA falla", async () => {
    vi.mocked(preguntarAlTutor).mockRejectedValue(new ErrorIA("caído", 503));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(pregunta())).status).toBe(502);
    expect(registrarIntercambio).not.toHaveBeenCalled();
  });

  it("si falla el guardado, el alumno recibe igualmente su respuesta", async () => {
    vi.mocked(registrarIntercambio).mockRejectedValue(new Error("BBDD caída"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(pregunta());
    expect(res.status).toBe(200);
    expect((await res.json()).mensaje).toEqual(respuestaTutor);
    // Se registra el fallo, pero nunca el texto de la pregunta.
    expect(error).toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).not.toContain("#enviar");
  });
});
