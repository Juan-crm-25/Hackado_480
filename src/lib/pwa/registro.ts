/**
 * Registro del service worker de la PWA (public/sw.js).
 * - En producción lo registra para toda la app, con `updateViaCache: "none"`: el navegador siempre comprueba
 *   si hay una versión nueva del worker.
 * - En desarrollo no lo registra y da de baja los que hubiera (p. ej. de probar `next start` en el mismo puerto),
 *   para que nunca sirva una interfaz vieja mientras se programa.
 */
type NavegadorConSW = {
  serviceWorker?: {
    register: (url: string, opciones: { scope: string; updateViaCache: "none" }) => Promise<unknown>;
    getRegistrations: () => Promise<readonly { unregister: () => Promise<boolean> }[]>;
  };
};

export function registrarServiceWorker({ produccion, navegador }: { produccion: boolean; navegador: NavegadorConSW }) {
  const sw = navegador.serviceWorker;
  if (!sw) return false;
  if (!produccion) {
    sw.getRegistrations()
      .then((registros) => Promise.all(registros.map((r) => r.unregister())))
      .catch(() => undefined);
    return false;
  }
  sw.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
    console.error("[pwa] No se pudo registrar el service worker:", error);
  });
  return true;
}
