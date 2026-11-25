import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatoPrecio } from "@/lib/formato";
import { NOMBRE_METODO, type IntentoPago } from "@/lib/pagos";

const FECHA = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" });

/** Confirmación del pago (o de la inscripción gratis) con su recibo. Es el título de la pantalla tras pagar. */
export function PagoCompletado({ pago }: { pago: IntentoPago }) {
  const gratis = pago.amount === 0;
  const filas = [
    { etiqueta: "Curso", valor: pago.curso.titulo },
    { etiqueta: "Importe", valor: formatoPrecio(pago.amount) },
    { etiqueta: "Método", valor: NOMBRE_METODO[pago.payment_method_types[0]] },
    { etiqueta: "Nº de pedido", valor: pago.pedido.id.slice(0, 8).toUpperCase() },
    { etiqueta: "Fecha", valor: FECHA.format(new Date(pago.pedido.pagadoEn)) },
  ];

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardContent className="flex flex-col items-center gap-6 text-center">
        <span
          className="inline-flex size-16 items-center justify-center rounded-full bg-brand text-surface-dark motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300"
          aria-hidden
        >
          <CircleCheck className="size-9" />
        </span>
        <div className="flex flex-col gap-2" role="status">
          <h1 className="text-3xl leading-tight font-bold">{gratis ? "¡Ya estás dentro!" : "¡Pago completado!"}</h1>
          <p className="text-muted-foreground">Ya tienes acceso a «{pago.curso.titulo}». Te esperamos en clase.</p>
        </div>

        <dl className="flex w-full flex-col gap-2 rounded-lg bg-muted p-4 text-left text-sm">
          {filas.map(({ etiqueta, valor }, i) => (
            <div key={etiqueta} className="flex flex-col gap-2">
              {i > 0 && <Separator />}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{etiqueta}</dt>
                <dd className="text-right font-medium tabular-nums">{valor}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Link
            href={`/cursos/${pago.curso.slug}/ruta`}
            className={buttonVariants({ variant: "accent", size: "lg", className: "flex-1" })}
          >
            Personaliza tu ruta (1 min)
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg", className: "flex-1" })}>
            Ir a Tus cursos
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
