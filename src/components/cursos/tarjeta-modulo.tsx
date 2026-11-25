import { CircleCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { etiquetaEstado } from "@/lib/estado-modulos";
import { ESTADOS_COMPLETADOS } from "@/lib/progreso";
import type { EstadoModulo } from "@/lib/types";
import { cn } from "@/lib/utils";

// Enlace de texto con zona táctil de 44 px (docs/estilo.md, apartado 7).
const CLASE_ENLACE = "inline-flex min-h-11 items-center rounded-sm underline underline-offset-4";

// Color de identidad de cada módulo según su orden: solo decorativo (docs/estilo.md, «Color con intención»).
const FRANJAS = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"];

export type ModuloDeTarjeta = { id: string; titulo: string; descripcion: string; numClases: number; numConceptos: number };

/**
 * Tarjeta de un módulo en el panel. Un módulo dominado o completado (solo se consigue aprobando su test) se
 * distingue del resto con borde y fondo de la marca, un icono y el texto «Test superado»: nunca solo con color.
 */
export function TarjetaModulo({
  modulo,
  estado,
  indice,
  recomendado,
}: {
  modulo: ModuloDeTarjeta;
  estado: EstadoModulo;
  indice: number;
  recomendado: boolean;
}) {
  const superado = (ESTADOS_COMPLETADOS as readonly EstadoModulo[]).includes(estado);

  return (
    <Card data-estado={estado} className={cn("flex-1 pt-0", superado && "border-2 border-brand bg-brand/10")}>
      <div aria-hidden className={cn("h-1.5", superado ? "bg-brand" : FRANJAS[indice % FRANJAS.length])} />
      <CardHeader className="flex-1">
        {superado ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-brand text-surface-dark">
              <CircleCheck aria-hidden />
              {etiquetaEstado(estado)}
            </Badge>
            <span className="text-xs font-semibold text-muted-foreground">Test superado</span>
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted-foreground">{etiquetaEstado(estado)}</p>
        )}
        {recomendado && (
          <div>
            <Badge>
              <Sparkles aria-hidden />
              Recomendado por tu tutor
            </Badge>
          </div>
        )}
        <CardTitle>
          <h3>
            <Link href={`/modulos/${modulo.id}`} className={`${CLASE_ENLACE} no-underline hover:underline`}>
              {modulo.titulo}
            </Link>
          </h3>
        </CardTitle>
        <CardDescription>{modulo.descripcion}</CardDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">
            {modulo.numClases} {modulo.numClases === 1 ? "vídeo" : "vídeos"}
          </Badge>
          <Badge variant="outline">
            {modulo.numConceptos} {modulo.numConceptos === 1 ? "concepto" : "conceptos"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 pt-1 text-sm font-medium">
          <Link href={`/modulos/${modulo.id}`} className={CLASE_ENLACE}>
            Ver vídeos
          </Link>
          <Link href={`/modulos/${modulo.id}/material`} className={CLASE_ENLACE}>
            Material de repaso
          </Link>
          <Link href={`/modulos/${modulo.id}/tutor`} className={CLASE_ENLACE}>
            Preguntar al tutor →
          </Link>
        </div>
      </CardHeader>
    </Card>
  );
}
