"use client";

import { Search } from "lucide-react";
import { useId, useState } from "react";
import { EstadoVacio } from "@/components/estado";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoriasDe, filtrarCursos } from "./buscar";
import { type CursoConValoracion, TarjetaCurso } from "./tarjeta-curso";

function Rejilla({ cursos }: { cursos: CursoConValoracion[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cursos.map((c) => (
        <li key={c.slug} className="flex">
          <TarjetaCurso curso={c} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Buscador y filtro del catálogo (en el navegador, sin peticiones): el texto busca en título, descripción
 * y categoría sin tener en cuenta tildes; la categoría se elige con un Select. Los resultados cambian al escribir.
 * Sin filtros se ven primero los destacados y luego todos los cursos.
 */
export function CatalogoCursos({ cursos, destacados }: { cursos: CursoConValoracion[]; destacados: readonly string[] }) {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const idBuscar = useId();
  const idCategoria = useId();

  const categorias = categoriasDe(cursos);
  const resultado = filtrarCursos(cursos, { texto, categoria });
  const hayFiltro = texto.trim() !== "" || categoria !== null;
  const cursosDestacados = destacados
    .map((slug) => cursos.find((c) => c.slug === slug))
    .filter((c): c is CursoConValoracion => c !== undefined);

  const limpiar = () => {
    setTexto("");
    setCategoria(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1 text-sm">
          <label htmlFor={idBuscar} className="text-xs font-semibold text-muted-foreground">
            Buscar cursos
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id={idBuscar}
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Python, cocina, oposiciones…"
              className="h-11 w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-base transition-colors duration-150 ease-in-out outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring dark:bg-input/30"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm md:w-60">
          <span id={idCategoria} className="text-xs font-semibold text-muted-foreground">
            Categoría
          </span>
          <Select
            items={[{ value: null, label: "Todas" }, ...categorias.map((c) => ({ value: c.slug, label: c.nombre }))]}
            value={categoria}
            onValueChange={(v) => setCategoria(v ?? null)}
          >
            <SelectTrigger aria-labelledby={idCategoria} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {resultado.length === 1 ? "1 curso" : `${resultado.length} cursos`}
        {hayFiltro ? (resultado.length === 1 ? " encontrado" : " encontrados") : ""}
      </p>

      {!hayFiltro && cursosDestacados.length > 0 && (
        <section aria-labelledby="destacados" className="flex flex-col gap-3">
          <h2 id="destacados" className="text-2xl leading-tight font-bold">
            Destacados
          </h2>
          <Rejilla cursos={cursosDestacados} />
        </section>
      )}

      <section aria-labelledby="todos" className="flex flex-col gap-3">
        <h2 id="todos" className="text-2xl leading-tight font-bold">
          {hayFiltro ? "Resultados" : "Todos los cursos"}
        </h2>
        {resultado.length === 0 ? (
          <EstadoVacio
            acciones={
              <div>
                <Button variant="outline" onClick={limpiar}>
                  Quitar filtros
                </Button>
              </div>
            }
          >
            No hay cursos que coincidan con tu búsqueda.
          </EstadoVacio>
        ) : (
          <Rejilla cursos={resultado} />
        )}
      </section>
    </div>
  );
}
