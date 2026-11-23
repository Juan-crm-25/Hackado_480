import { afterEach, describe, expect, it, vi } from "vitest";
import { completar, ErrorIA } from "./cliente";
import { contenidoDelCurso, filtrarTexto } from "./privacidad";

function configurarIA() {
  vi.stubEnv("AI_BASE_URL", "https://ia.ejemplo.test/v1/");
  vi.stubEnv("AI_API_KEY", "clave-de-prueba");
  vi.stubEnv("AI_MODEL_TUTOR", "modelo-mediano");
  vi.stubEnv("AI_SEUDONIMO_SAL", "sal");
}

function respuestaOk(texto: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: texto } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    { status: 200 },
  );
}

const mensajes = [
  { rol: "sistema" as const, contenido: contenidoDelCurso("Eres el tutor del módulo CSS.") },
  { rol: "usuario" as const, contenido: filtrarTexto("Soy Lucía, ¿qué es la especificidad?", ["Lucía"]).texto },
];

describe("completar", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sin clave funciona en modo simulado y no hace llamadas de red", async () => {
    vi.stubEnv("AI_BASE_URL", "");
    vi.stubEnv("AI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const r = await completar({ modelo: "tutor", mensajes });
    expect(r.simulado).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await completar({ modelo: "tutor", mensajes, formatoJson: true })).texto).toBe("{}");
  });

  it("envía una petición compatible con OpenAI, ya filtrada", async () => {
    configurarIA();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(respuestaOk("La especificidad es..."));
    vi.stubGlobal("fetch", fetchMock);

    const r = await completar({ modelo: "tutor", mensajes, formatoJson: true });

    expect(r).toEqual({ texto: "La especificidad es...", simulado: false, tokens: { entrada: 10, salida: 5 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ia.ejemplo.test/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer clave-de-prueba");
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo.model).toBe("modelo-mediano");
    expect(cuerpo.response_format).toEqual({ type: "json_object" });
    expect(cuerpo.messages).toEqual([
      { role: "system", content: "Eres el tutor del módulo CSS." },
      { role: "user", content: "Soy [NOMBRE], ¿qué es la especificidad?" },
    ]);
    expect(init.body).not.toContain("Lucía");
  });

  it("reintenta una vez si el proveedor está saturado", async () => {
    configurarIA();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(respuestaOk("ok"));
    vi.stubGlobal("fetch", fetchMock);

    expect((await completar({ modelo: "tutor", mensajes })).texto).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lanza ErrorIA si el proveedor rechaza la petición", async () => {
    configurarIA();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
    await expect(completar({ modelo: "tutor", mensajes })).rejects.toBeInstanceOf(ErrorIA);
  });

  it("exige la sal de seudónimos cuando la IA es real", async () => {
    configurarIA();
    vi.stubEnv("AI_SEUDONIMO_SAL", "");
    await expect(completar({ modelo: "tutor", mensajes })).rejects.toThrow(/AI_SEUDONIMO_SAL/);
  });
});
