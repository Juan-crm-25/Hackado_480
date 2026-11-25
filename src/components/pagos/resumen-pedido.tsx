import { BookOpen, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatoPrecio } from "@/lib/formato";

export type CursoDelPedido = { slug: string; titulo: string; categoria: string; numModulos: number };

/** Resumen del carrito: el curso, su precio (de la BBDD) y el total. */
export function ResumenPedido({ curso, precioCentimos }: { curso: CursoDelPedido; precioCentimos: number }) {
  const precio = formatoPrecio(precioCentimos);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-bold">Tu pedido</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-surface-dark text-brand" aria-hidden>
            <BookOpen className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="font-semibold leading-tight">{curso.titulo}</p>
            <p className="text-sm text-muted-foreground">
              {curso.categoria} · {curso.numModulos} módulos
            </p>
          </div>
          <p className="font-semibold tabular-nums">{precio}</p>
        </div>

        <Separator />

        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{precio}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Impuestos</dt>
            <dd>IVA incluido</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="text-2xl font-bold tabular-nums">{precio}</dd>
          </div>
        </dl>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          Acceso para siempre al curso, a su tutor con IA y a su material de repaso.
        </p>
      </CardContent>
    </Card>
  );
}
