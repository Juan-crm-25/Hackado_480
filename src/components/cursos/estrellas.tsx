import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cinco estrellas decorativas (la cifra siempre va en texto al lado: nada depende solo del color).
 * Se rellenan tantas como el valor redondeado. Lleva su etiqueta accesible.
 */
export function Estrellas({ valor, className }: { valor: number; className?: string }) {
  const llenas = Math.round(valor);
  return (
    <span role="img" aria-label={`${llenas} de 5 estrellas`} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-4", n <= llenas ? "fill-current text-brand-coral" : "text-muted-foreground")}
        />
      ))}
    </span>
  );
}
