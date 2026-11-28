import { Clock, MessageCircleQuestion, TriangleAlert } from "lucide-react";
import { EstadoVacio } from "@/components/estado";
import { Badge } from "@/components/ui/badge";
import { contar } from "@/lib/formato";
import type { AlertaAlumno, InformeRadar } from "@/lib/types";
import { haceCuanto } from "./hace-cuanto";
import { ResumenDudas } from "./resumen-dudas";

/**
 * Radar del tutor (#5) para el profesor: a quién ayudar, qué conceptos se fallan y qué se pregunta al tutor.
 * Componente de servidor sin estado: recibe el informe ya calculado.
 * Nada depende solo del color: el motivo va en texto e icono, y los porcentajes escritos.
 */
export function VistaRadar({ informe, ahora }: { informe: InformeRadar; ahora: Date }) {
  const modulos = Object.fromEntries(informe.modulos.map((m) => [m.id, m.titulo]));
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl leading-tight font-bold md:text-4xl">Radar del tutor</h1>
        <p className="text-base text-muted-foreground">
          {informe.curso.titulo} · {contar(informe.alumnos, "alumno", "alumnos")}
        </p>
      </header>

      <section aria-labelledby="necesitan-ayuda" className="flex flex-col gap-3">
        <h2 id="necesitan-ayuda" className="text-2xl leading-tight font-bold">
          Necesitan ayuda ({informe.alertas.length})
        </h2>
        {informe.alertas.length === 0 ? (
          <EstadoVacio>Nadie necesita ayuda ahora mismo. Ningún alumno está atascado ni lleva más de una semana sin entrar.</EstadoVacio>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {informe.alertas.map((a) => (
              <li key={`${a.motivo}-${a.alumnoId}-${a.conceptoId ?? ""}`}>
                <TarjetaAlerta alerta={a} modulo={modulos[a.moduloId] ?? a.moduloId} ahora={ahora} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="conceptos-fallados" className="flex flex-col gap-3">
        <h2 id="conceptos-fallados" className="text-2xl leading-tight font-bold">
          Conceptos que más se fallan
        </h2>
        <p className="text-sm text-muted-foreground">
          Si casi todos fallan lo mismo, puede que el problema esté en el vídeo y no en los alumnos.
        </p>
        {informe.conceptosMasFallados.length === 0 ? (
          <EstadoVacio>Aún no hay intentos suficientes para saber qué conceptos cuestan más.</EstadoVacio>
        ) : (
          <ol className="flex flex-col gap-4 rounded-lg border p-4">
            {informe.conceptosMasFallados.map((c) => {
              const porcentaje = Math.round(c.porcentajeFallo * 100);
              return (
                <li key={c.conceptoId} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-bold">{c.concepto}</span>
                    <span className="text-sm text-muted-foreground">{modulos[c.moduloId] ?? c.moduloId}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-sm bg-muted" aria-hidden>
                    <div className="h-full rounded-sm bg-chart-3" style={{ width: `${porcentaje}%` }} />
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">{porcentaje} % de fallos</span>
                    <span className="text-muted-foreground"> · {c.intentos} intentos</span>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="dudas-frecuentes" className="flex flex-col gap-3">
        <h2 id="dudas-frecuentes" className="text-2xl leading-tight font-bold">
          Dudas frecuentes al tutor
        </h2>
        <p className="text-sm text-muted-foreground">Preguntas de las 2 últimas semanas, ya sin datos personales.</p>
        {informe.dudasFrecuentes.length > 0 && <ResumenDudas curso={informe.curso.slug} />}
        {informe.dudasFrecuentes.length === 0 ? (
          <EstadoVacio>Aún no hay preguntas al tutor en este curso.</EstadoVacio>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {informe.dudasFrecuentes.map((d) => (
              <article key={d.moduloId} className="flex flex-col gap-2 rounded-lg border p-4">
                <h3 className="flex items-baseline justify-between gap-3 font-bold">
                  {d.modulo}
                  <span className="text-sm font-normal text-muted-foreground">{contar(d.total, "pregunta", "preguntas")}</span>
                </h3>
                <ul className="flex flex-col gap-2">
                  {d.masRepetidas.map((p) => (
                    <li key={p.texto} className="flex items-start gap-2 text-sm">
                      <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 break-words">{p.texto}</span>
                      <span className="shrink-0 text-muted-foreground">{p.veces === 1 ? "1 vez" : `${p.veces} veces`}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TarjetaAlerta({ alerta, modulo, ahora }: { alerta: AlertaAlumno; modulo: string; ahora: Date }) {
  const atascado = alerta.motivo === "fallos_repetidos";
  const Icono = atascado ? TriangleAlert : Clock;
  return (
    <article className="flex h-full flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-bold break-words">{alerta.nombre}</h3>
        <Badge variant={atascado ? "default" : "secondary"} className="shrink-0">
          <Icono aria-hidden />
          {atascado ? "Atascado" : "Inactivo"}
        </Badge>
      </div>
      <p className="text-sm">{alerta.detalle}</p>
      <p className="text-sm text-muted-foreground">
        {modulo} · {haceCuanto(new Date(alerta.fecha), ahora)}
      </p>
    </article>
  );
}
