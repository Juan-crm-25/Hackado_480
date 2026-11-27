import { describe, expect, it, vi } from "vitest";
import nextConfig from "../../../next.config";
import { registrarServiceWorker } from "./registro";

function navegadorFalso() {
  const baja = vi.fn(async () => true);
  return {
    baja,
    navegador: {
      serviceWorker: {
        register: vi.fn(async () => ({})),
        getRegistrations: vi.fn(async () => [{ unregister: baja }]),
      },
    },
  };
}

describe("registrarServiceWorker", () => {
  it("en producción registra /sw.js para toda la app y sin caché HTTP del propio worker", () => {
    const { navegador } = navegadorFalso();
    expect(registrarServiceWorker({ produccion: true, navegador })).toBe(true);
    expect(navegador.serviceWorker.register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  });

  it("en desarrollo no lo registra y da de baja los que hubiera, para no servir cosas viejas", async () => {
    const { navegador, baja } = navegadorFalso();
    expect(registrarServiceWorker({ produccion: false, navegador })).toBe(false);
    expect(navegador.serviceWorker.register).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(baja).toHaveBeenCalled());
  });

  it("si el navegador no tiene service workers, no hace nada", () => {
    expect(registrarServiceWorker({ produccion: true, navegador: {} })).toBe(false);
  });
});

describe("cabeceras de /sw.js (next.config.ts)", () => {
  it("el navegador nunca guarda el worker y solo puede cargar código propio", async () => {
    const reglas = (await nextConfig.headers!()) ?? [];
    const sw = reglas.find((r) => r.source === "/sw.js");
    const cabeceras = Object.fromEntries((sw?.headers ?? []).map((h) => [h.key, h.value]));
    expect(cabeceras["Cache-Control"]).toBe("no-cache, no-store, must-revalidate");
    expect(cabeceras["Content-Type"]).toBe("application/javascript; charset=utf-8");
    expect(cabeceras["Content-Security-Policy"]).toBe("default-src 'self'; script-src 'self'");
  });
});
