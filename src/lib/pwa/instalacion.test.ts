import { afterEach, describe, expect, it, vi } from "vitest";
import { esIos, estadoInstalacion, guardarAviso, hayAviso, instalar, olvidarAviso, suscribirAviso, type AvisoInstalacion } from "./instalacion";

afterEach(() => olvidarAviso());

/** Aviso falso de Chrome (beforeinstallprompt) que responde con la elección dada. */
function avisoFalso(eleccion: "accepted" | "dismissed"): AvisoInstalacion {
  return { prompt: vi.fn(async () => {}), userChoice: Promise.resolve({ outcome: eleccion, platform: "web" }) };
}

describe("estadoInstalacion", () => {
  it("si ya se abre como app instalada, no se ofrece nada", () => {
    expect(estadoInstalacion({ instalada: true, ios: false, hayAviso: true })).toBe("instalada");
    expect(estadoInstalacion({ instalada: true, ios: true, hayAviso: false })).toBe("instalada");
  });

  it("si el navegador ha avisado de que se puede instalar (Chrome, Edge, Android), se ofrece el botón", () => {
    expect(estadoInstalacion({ instalada: false, ios: false, hayAviso: true })).toBe("disponible");
  });

  it("en iPhone/iPad no hay aviso: se explica cómo añadirla a la pantalla de inicio", () => {
    expect(estadoInstalacion({ instalada: false, ios: true, hayAviso: false })).toBe("ios");
  });

  it("sin aviso y sin ser iOS (Firefox, o aún no se puede), no se muestra nada", () => {
    expect(estadoInstalacion({ instalada: false, ios: false, hayAviso: false })).toBe("no_disponible");
  });
});

describe("esIos", () => {
  it("reconoce iPhone, iPad e iPod", () => {
    expect(esIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe(true);
    expect(esIos("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)", 5)).toBe(true);
  });

  it("reconoce el iPad moderno, que se presenta como Mac pero es táctil", () => {
    expect(esIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
  });

  it("un Mac de verdad (sin pantalla táctil), Android o Windows no son iOS", () => {
    expect(esIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(esIos("Mozilla/5.0 (Linux; Android 14; Pixel 8)", 5)).toBe(false);
    expect(esIos("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0)).toBe(false);
  });
});

describe("aviso de instalación guardado", () => {
  it("se guarda, avisa a quien escucha y se olvida", () => {
    const avisar = vi.fn();
    const dejar = suscribirAviso(avisar);
    guardarAviso(avisoFalso("accepted"));
    expect(hayAviso()).toBe(true);
    olvidarAviso();
    expect(hayAviso()).toBe(false);
    expect(avisar).toHaveBeenCalledTimes(2);
    dejar();
  });

  it("instalar abre la ventana del navegador y, acepte o no, el aviso ya no sirve y se olvida", async () => {
    for (const eleccion of ["accepted", "dismissed"] as const) {
      const aviso = avisoFalso(eleccion);
      guardarAviso(aviso);
      expect(await instalar()).toBe(eleccion);
      expect(aviso.prompt).toHaveBeenCalledOnce();
      expect(hayAviso()).toBe(false);
    }
  });

  it("instalar sin aviso no hace nada", async () => {
    expect(await instalar()).toBeNull();
  });
});
