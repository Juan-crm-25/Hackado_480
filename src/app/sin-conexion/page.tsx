import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { BotonReintentar } from "@/components/pwa/boton-reintentar";

export const metadata: Metadata = { title: "Sin conexión · 480 Academy" };

/**
 * Página que el service worker (public/sw.js) muestra al abrir una pantalla sin red. Es estática y va fuera del
 * marco de la app (sin navegación ni sesión) porque se guarda en la caché del dispositivo: no puede llevar datos.
 */
export default function SinConexion() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <WifiOff className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-3xl leading-tight font-bold">Sin conexión</h1>
      <p className="text-base text-muted-foreground">
        Comprueba tu conexión a internet. En cuanto vuelva, pulsa «Reintentar» y seguirás donde lo dejaste.
      </p>
      <BotonReintentar />
    </main>
  );
}
