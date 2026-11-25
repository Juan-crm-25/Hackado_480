import { CircleCheck, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RespuestaRuta } from "@/lib/ruta";

/** La ruta personalizada con la recomendación del tutor (frases de plantilla, sin IA). */
export function ResultadoRuta({ resultado, onCambiar }: { resultado: RespuestaRuta; onCambiar: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="recomendacion" className="flex items-start gap-3">
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-dark text-brand"
          aria-hidden
        >
          <MessageCircle className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg rounded-tl-none bg-muted p-4">
          <h2 id="recomendacion" className="text-sm font-semibold text-muted-foreground">
            Tu tutor te recomienda
          </h2>
          {resultado.recomendacion.map((frase) => (
            <p key={frase} className="max-w-prose text-base">
              {frase}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="tu-ruta" className="flex flex-col gap-3">
        <h2 id="tu-ruta" className="text-2xl leading-tight font-bold">
          Tu ruta
        </h2>
        <ol className="flex flex-col gap-3">
          {resultado.modulos.map((m, i) => (
            <li key={m.id}>
              <Card className={m.id === resultado.principal ? "border-primary" : undefined}>
                <CardContent className="flex items-start gap-4">
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold tabular-nums"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="text-lg leading-tight font-bold">{m.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{m.descripcion}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.id === resultado.principal && (
                        <Badge>
                          <Sparkles aria-hidden />
                          Recomendado por tu tutor
                        </Badge>
                      )}
                      {m.valoracion === "sabe" && (
                        <Badge variant="secondary">
                          <CircleCheck aria-hidden />
                          Ya lo dominas
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard" className={buttonVariants({ variant: "accent", size: "lg", className: "flex-1" })}>
          Empezar
        </Link>
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onCambiar}>
          Cambiar mis respuestas
        </Button>
      </div>
    </div>
  );
}
