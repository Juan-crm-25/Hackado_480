import { EstadoVacio } from "@/components/estado";
import type { ResumenValoraciones, Valoracion } from "@/lib/demo/valoraciones";
import { formatoDecimal } from "@/lib/formato";
import { Estrellas } from "./estrellas";
import { porcentaje, textoValoraciones } from "./textos";

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Sección «Valoraciones» de la página de un curso: media, reparto por estrellas y la lista.
 * Son DATOS DE EJEMPLO (src/lib/demo/): la sección lo dice en letra pequeña para que nadie los tome por reales.
 */
export function ValoracionesCurso({ resumen, valoraciones }: { resumen: ResumenValoraciones; valoraciones: Valoracion[] }) {
  return (
    <section aria-labelledby="valoraciones" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="valoraciones" className="text-2xl leading-tight font-bold">
          Valoraciones
        </h2>
        <p className="text-xs text-muted-foreground">Valoraciones de ejemplo: no son opiniones reales de alumnos.</p>
      </div>

      {resumen.media === null ? (
        <EstadoVacio>Este curso todavía no tiene valoraciones.</EstadoVacio>
      ) : (
        <>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-4xl leading-none font-bold">
                {formatoDecimal(resumen.media)}
                <span className="sr-only"> de 5</span>
              </p>
              <Estrellas valor={resumen.media} />
              <p className="text-sm text-muted-foreground">{textoValoraciones(resumen.total)}</p>
            </div>

            <ul aria-label="Reparto por estrellas" className="flex flex-1 flex-col gap-1">
              {resumen.distribucion.map(({ estrellas, cantidad }) => (
                <li key={estrellas} className="flex items-center gap-2 text-sm">
                  <span className="w-20 shrink-0">
                    {estrellas} {estrellas === 1 ? "estrella" : "estrellas"}
                  </span>
                  <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-chart-3"
                      style={{ width: `${porcentaje(cantidad, resumen.total)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-muted-foreground">
                    {cantidad}
                    <span className="sr-only"> {cantidad === 1 ? "valoración" : "valoraciones"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="flex flex-col gap-3">
            {valoraciones.map((v) => (
              <li key={`${v.autor}-${v.fecha}`} className="flex flex-col gap-1 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{v.autor}</p>
                  <time dateTime={v.fecha} className="text-xs text-muted-foreground">
                    {FECHA.format(new Date(`${v.fecha}T00:00:00Z`))}
                  </time>
                </div>
                <Estrellas valor={v.estrellas} />
                <p className="max-w-prose text-sm">{v.comentario}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
