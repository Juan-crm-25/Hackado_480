/**
 * Instalar la PWA desde un botón («Descarga la app»), sin ir a los ajustes del navegador.
 * - Chrome, Edge y Android avisan de que la app se puede instalar con el evento `beforeinstallprompt`: se guarda el
 *   aviso y el botón abre con él la ventana de instalación del navegador. Ese aviso solo sirve una vez.
 * - Safari en iPhone/iPad no tiene ese evento: solo se puede añadir a mano («Compartir → Añadir a pantalla de inicio»).
 * - Firefox de escritorio no instala PWAs: no se ofrece nada.
 */

/** Lo que se usa del evento `beforeinstallprompt` (no está en los tipos de TypeScript). */
export interface AvisoInstalacion {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type EstadoInstalacion = "instalada" | "disponible" | "ios" | "no_disponible";

export function estadoInstalacion({
  instalada,
  ios,
  hayAviso,
}: {
  instalada: boolean;
  ios: boolean;
  hayAviso: boolean;
}): EstadoInstalacion {
  if (instalada) return "instalada";
  if (hayAviso) return "disponible";
  if (ios) return "ios";
  return "no_disponible";
}

/** iPhone, iPad o iPod; el iPad moderno se presenta como Mac, pero es táctil. */
export function esIos(userAgent: string, puntosTactiles: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && puntosTactiles > 1);
}

// El aviso puede llegar antes de que se pinte el botón: se guarda aquí y quien lo pinte se suscribe.
let aviso: AvisoInstalacion | null = null;
const oyentes = new Set<() => void>();

function cambiar(nuevo: AvisoInstalacion | null) {
  aviso = nuevo;
  oyentes.forEach((avisar) => avisar());
}

export const guardarAviso = (nuevo: AvisoInstalacion) => cambiar(nuevo);
export const olvidarAviso = () => cambiar(null);
export const hayAviso = () => aviso !== null;

export function suscribirAviso(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

/** Abre la ventana de instalación del navegador. Devuelve lo que eligió el usuario, o null si no había aviso. */
export async function instalar(): Promise<"accepted" | "dismissed" | null> {
  const actual = aviso;
  if (!actual) return null;
  olvidarAviso(); // el aviso solo sirve una vez, acepte o no
  await actual.prompt();
  return (await actual.userChoice).outcome;
}
