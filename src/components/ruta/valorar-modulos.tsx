"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EstadoError } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import { VALORACION_POR_DEFECTO, VALORACIONES, type ModuloDeRuta, type RespuestaRuta, type Valoracion } from "@/lib/ruta";
import { ResultadoRuta } from "./resultado-ruta";

/**
 * Personalizar la ruta: el alumno valora cada módulo («Me interesa mucho», «Me interesa», «Ya lo sé»)
 * y PUT /api/cursos/:slug/ruta devuelve el nuevo orden con la recomendación del tutor.
 */
export function ValorarModulos({ slug, modulos }: { slug: string; modulos: ModuloDeRuta[] }) {
  const router = useRouter();
  const [valoraciones, setValoraciones] = useState<Record<string, Valoracion>>(() =>
    Object.fromEntries(modulos.map((m) => [m.id, VALORACION_POR_DEFECTO])),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespuestaRuta | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/cursos/${encodeURIComponent(slug)}/ruta`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ valoraciones }),
      });
      setResultado(await leerRespuesta<RespuestaRuta>(res));
      router.refresh(); // el panel ya muestra la ruta nueva
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) return <ResultadoRuta resultado={resultado} onCambiar={() => setResultado(null)} />;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {modulos.map((m) => (
          <li key={m.id}>
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg leading-tight font-bold">{m.titulo}</h2>
                  <p className="text-sm text-muted-foreground">{m.descripcion}</p>
                </div>
                <ToggleGroup
                  value={[valoraciones[m.id]]}
                  // Al pulsar la opción ya elegida, Base UI la desmarca (valor vacío): se ignora para que siempre haya una.
                  onValueChange={(v) => v[0] && setValoraciones({ ...valoraciones, [m.id]: v[0] as Valoracion })}
                  aria-label={`¿Cuánto te interesa ${m.titulo}?`}
                  spacing={1}
                  className="grid w-full grid-cols-3 rounded-lg bg-muted p-1"
                  disabled={enviando}
                >
                  {VALORACIONES.map((v) => (
                    <ToggleGroupItem
                      key={v.id}
                      value={v.id}
                      className="h-auto min-h-11 px-2 py-2 text-center text-sm whitespace-normal text-muted-foreground hover:bg-background/60 aria-pressed:bg-background aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-sm"
                    >
                      {v.texto}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {error && <EstadoError>{error}</EstadoError>}

      <Button type="submit" variant="accent" size="lg" disabled={enviando} className="w-full">
        {enviando ? "Preparando tu ruta…" : "Ver mi ruta"}
      </Button>
    </form>
  );
}
