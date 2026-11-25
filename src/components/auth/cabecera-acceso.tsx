import type { ReactNode } from "react";

/** Título y frase de las pantallas de acceso (login y registro). */
export function CabeceraAcceso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl leading-tight font-bold">{titulo}</h1>
      <p className="text-muted-foreground">{children}</p>
    </header>
  );
}
