/**
 * Prueba REAL contra el proveedor de IA. Solo se ejecuta si hay clave en .env.local:
 *   npm run test:ia
 * Envía una frase sin datos personales y comprueba que el modelo responde en español.
 */
import { describe, expect, it } from "vitest";
import { completar } from "./cliente";
import { contenidoDelCurso } from "./privacidad";

const hayClave = Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY);

describe.skipIf(!hayClave)("conexión con el proveedor de IA", () => {
  it("el modelo del tutor responde", { timeout: 60_000 }, async () => {
    const r = await completar({
      modelo: "tutor",
      mensajes: [
        { rol: "sistema", contenido: contenidoDelCurso("Responde en español, en una sola frase.") },
        { rol: "usuario", contenido: contenidoDelCurso("¿Para qué sirve CSS?") },
      ],
      maxTokens: 100,
    });
    console.log(`Respuesta: ${r.texto}\nTokens: ${JSON.stringify(r.tokens)}`);
    expect(r.simulado).toBe(false);
    expect(r.texto.length).toBeGreaterThan(0);
  });
});
