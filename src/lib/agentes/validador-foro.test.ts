import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfigIAForo } from "../ai/config-foro";
import { ErrorValidadorForo, OPCIONES_VALIDADOR, validarComentarioForo } from "./validador-foro";

const DUDA = { titulo: "¿Qué gana, una clase o un id?", cuerpo: "Me lo pregunto con dos selectores a la vez." };

const CONFIG = {
  baseUrl: "https://openrouter.test/api",
  apiKey: "clave-de-prueba",
  modelo: "perplexity/pplx-decider-v1.3:free",
  umbralConfianza: 0.6,
  simulado: false,
};

/** fetch falso que devuelve la decisión dada y guarda la petición. */
function fetchCon(answers: unknown, status = 200) {
  return vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify({ answers, usage: { input_tokens: 300 } }), { status }),
  );
}

const decision = (choice: string, confidence = 0.9) => ({ valoracion: { type: "choice", choice, confidence } });

afterEach(() => vi.unstubAllEnvs());

describe("validarComentarioForo", () => {
  it("pide a la Decisions API una sola decisión entre las cuatro opciones, con el texto filtrado", async () => {
    const fetch = fetchCon(decision("correcta"));
    await validarComentarioForo(
      { duda: DUDA, comentario: "Gana el id. Escríbeme a ana@correo.es o al 612345678", nombres: ["Ana Pérez"] },
      { fetch, config: CONFIG },
    );

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://openrouter.test/api/alpha/decisions");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer clave-de-prueba");
    const cuerpo = JSON.parse(String(init.body));
    expect(cuerpo.model).toBe("perplexity/pplx-decider-v1.3:free");
    expect(Object.keys(cuerpo.questions)).toEqual(["valoracion"]);
    expect(cuerpo.questions.valoracion.type).toBe("choice");
    expect(Object.keys(cuerpo.questions.valoracion.criteria)).toEqual([...OPCIONES_VALIDADOR]);
    // Solo texto filtrado: ni email, ni teléfono, ni nombres.
    expect(cuerpo.state).toContain("¿Qué gana, una clase o un id?");
    expect(cuerpo.state).toContain("Gana el id.");
    expect(cuerpo.state).not.toMatch(/ana@correo\.es|612345678|Ana|Pérez/);
  });

  it("traduce la decisión: respuesta correcta, aproximada o incorrecta", async () => {
    for (const valoracion of ["correcta", "aproximada", "incorrecta"] as const) {
      const r = await validarComentarioForo({ duda: DUDA, comentario: "x" }, { fetch: fetchCon(decision(valoracion)), config: CONFIG });
      expect(r).toEqual({ tipo: "respuesta", valoracion });
    }
  });

  it("un comentario que no responde a la duda queda como no_respuesta", async () => {
    const r = await validarComentarioForo({ duda: DUDA, comentario: "¡Gracias!" }, { fetch: fetchCon(decision("no_respuesta")), config: CONFIG });
    expect(r).toEqual({ tipo: "no_respuesta" });
  });

  it("si la confianza es menor que el umbral, no decide: queda para el profesor", async () => {
    const r = await validarComentarioForo({ duda: DUDA, comentario: "x" }, { fetch: fetchCon(decision("correcta", 0.4)), config: CONFIG });
    expect(r).toEqual({ tipo: "dudosa" });
  });

  it("una respuesta con una opción que no existe o mal formada es un error (no se inventa nada)", async () => {
    await expect(
      validarComentarioForo({ duda: DUDA, comentario: "x" }, { fetch: fetchCon(decision("excelente")), config: CONFIG }),
    ).rejects.toBeInstanceOf(ErrorValidadorForo);
    await expect(
      validarComentarioForo({ duda: DUDA, comentario: "x" }, { fetch: fetchCon({}), config: CONFIG }),
    ).rejects.toBeInstanceOf(ErrorValidadorForo);
  });

  it("si la API falla (por ejemplo, límite del plan gratuito) es un error", async () => {
    await expect(
      validarComentarioForo({ duda: DUDA, comentario: "x" }, { fetch: fetchCon({}, 429), config: CONFIG }),
    ).rejects.toBeInstanceOf(ErrorValidadorForo);
  });

  it("en modo simulado (sin clave) no llama a la red y decide con reglas fijas", async () => {
    const fetch = fetchCon(decision("correcta"));
    const simulado = { ...CONFIG, apiKey: "", simulado: true };
    expect(await validarComentarioForo({ duda: DUDA, comentario: "¡Gracias!" }, { fetch, config: simulado })).toEqual({
      tipo: "no_respuesta",
    });
    expect(
      await validarComentarioForo(
        { duda: DUDA, comentario: "Gana el id porque tiene más especificidad que una clase." },
        { fetch, config: simulado },
      ),
    ).toEqual({ tipo: "respuesta", valoracion: "aproximada" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("getConfigIAForo", () => {
  it("usa sus propias variables, separadas de las del tutor, y Decider V1.3 gratis por defecto", () => {
    vi.stubEnv("AI_FORO_API_KEY", "k");
    vi.stubEnv("AI_FORO_MODEL", "");
    vi.stubEnv("AI_API_KEY", "clave-del-tutor");
    const config = getConfigIAForo();
    expect(config).toMatchObject({
      baseUrl: "https://openrouter.ai/api",
      apiKey: "k",
      modelo: "perplexity/pplx-decider-v1.3:free",
      simulado: false,
    });
  });

  it("sin AI_FORO_API_KEY está en modo simulado aunque el tutor tenga clave", () => {
    vi.stubEnv("AI_FORO_API_KEY", "");
    vi.stubEnv("AI_API_KEY", "clave-del-tutor");
    expect(getConfigIAForo().simulado).toBe(true);
  });
});
