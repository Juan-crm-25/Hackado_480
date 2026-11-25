import { redirect } from "next/navigation";
import { destinoTrasLogin } from "@/lib/destino";
import { obtenerUsuarioActual } from "@/server/auth/usuario-actual";

/** Si ya hay una sesión válida, el login y el registro llevan directamente al destino. */
export async function RedirigirSiHaySesion({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  const [usuario, { volver }] = await Promise.all([obtenerUsuarioActual(), searchParams]);
  if (usuario) redirect(destinoTrasLogin(typeof volver === "string" ? volver : null));
  return null;
}
