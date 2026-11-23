/**
 * Dibujo de las infografías (#7). La IA solo rellena datos; aquí están las 4 plantillas.
 * Sin imágenes ni librerías: HTML y CSS, ligero en 4G y legible a 360 px.
 */
import { FuenteVideo, TextoConCodigo, type VideoResumen } from "@/components/fuente-video";
import type { ElementoInfografia, Infografia } from "@/lib/types";

// Tonos de la misma familia, de más claro (fuera) a más intenso (dentro / primero).
const TONOS = ["bg-sky-50", "bg-sky-100", "bg-sky-200", "bg-sky-300", "bg-sky-400", "bg-sky-500"];
const TONOS_TEXTO = ["text-sky-950", "text-sky-950", "text-sky-950", "text-sky-950", "text-white", "text-white"];

export function VistaInfografia({ infografia, videos }: { infografia: Infografia; videos: VideoResumen[] }) {
  return (
    <figure className="flex flex-col gap-3 rounded-xl border p-4">
      <figcaption className="font-semibold">{infografia.titulo}</figcaption>
      {infografia.plantilla === "capas" && <Capas elementos={infografia.elementos} />}
      {infografia.plantilla === "jerarquia" && <Jerarquia elementos={infografia.elementos} />}
      {infografia.plantilla === "pasos" && <Pasos elementos={infografia.elementos} />}
      {infografia.plantilla === "comparativa" && <Comparativa columnas={infografia.columnas} filas={infografia.filas} />}
      {infografia.fuente && (
        <div>
          <FuenteVideo fuente={infografia.fuente} videos={videos} />
        </div>
      )}
    </figure>
  );
}

/** Cajas una dentro de otra: el primer elemento es la capa exterior. Debajo, la leyenda. */
function Capas({ elementos }: { elementos: ElementoInfografia[] }) {
  const anidar = (i: number): React.ReactNode =>
    i >= elementos.length ? null : (
      <div className={`rounded-lg border border-sky-700/30 px-2 pt-1 pb-2 ${TONOS[i]} ${TONOS_TEXTO[i]}`}>
        <span className="block text-xs font-semibold">{elementos[i].nombre}</span>
        {i + 1 < elementos.length && <div className="mt-1">{anidar(i + 1)}</div>}
      </div>
    );

  return (
    <>
      <div aria-hidden>{anidar(0)}</div>
      <Leyenda elementos={elementos} />
    </>
  );
}

/** De más a menos: barras cada vez más cortas, con "gana a" entre ellas. */
function Jerarquia({ elementos }: { elementos: ElementoInfografia[] }) {
  return (
    <ol className="flex flex-col items-center gap-1">
      {elementos.map((e, i) => (
        <li key={e.nombre} className="flex w-full flex-col items-center gap-1">
          <div
            className={`rounded-lg px-3 py-2 text-center ${TONOS[TONOS.length - 1 - Math.min(i, TONOS.length - 1)]} ${TONOS_TEXTO[TONOS.length - 1 - Math.min(i, TONOS.length - 1)]}`}
            style={{ width: `${100 - i * (50 / Math.max(elementos.length - 1, 1))}%` }}
          >
            <span className="block text-sm font-semibold">
              <TextoConCodigo texto={e.nombre} />
            </span>
            <span className="block text-xs opacity-90">
              <TextoConCodigo texto={e.descripcion} />
            </span>
          </div>
          {i + 1 < elementos.length && <span className="text-xs text-muted-foreground">gana a ▼</span>}
        </li>
      ))}
    </ol>
  );
}

/** Proceso en orden: línea vertical con pasos numerados. */
function Pasos({ elementos }: { elementos: ElementoInfografia[] }) {
  return (
    <ol className="flex flex-col">
      {elementos.map((e, i) => (
        <li key={e.nombre} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">{i + 1}</span>
            {i + 1 < elementos.length && <span className="w-0.5 flex-1 bg-sky-200" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-semibold">
              <TextoConCodigo texto={e.nombre} />
            </p>
            <p className="text-sm text-muted-foreground">
              <TextoConCodigo texto={e.descripcion} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Comparativa: en el móvil, una tarjeta por opción en lugar de una tabla ancha. */
function Comparativa({ columnas, filas }: { columnas: string[]; filas: { nombre: string; valores: string[] }[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {filas.map((f, i) => (
        <li key={f.nombre} className={`rounded-lg p-3 ${TONOS[Math.min(i, 2)]}`}>
          <p className="text-sm font-semibold text-sky-950">
            <TextoConCodigo texto={f.nombre} />
          </p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            {columnas.map((c, j) => (
              <div key={c} className="contents">
                <dt className="text-muted-foreground">{c}</dt>
                <dd className="min-w-0 break-words">
                  <TextoConCodigo texto={f.valores[j] ?? ""} />
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function Leyenda({ elementos }: { elementos: ElementoInfografia[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {elementos.map((e, i) => (
        <div key={e.nombre} className="flex gap-2">
          <span className={`mt-1 size-3 shrink-0 rounded-sm border border-sky-700/30 ${TONOS[i]}`} aria-hidden />
          <div className="min-w-0 text-sm">
            <dt className="inline font-semibold">{e.nombre}: </dt>
            <dd className="inline">
              <TextoConCodigo texto={e.descripcion} />
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
