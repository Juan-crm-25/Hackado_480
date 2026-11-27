import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getModulo } from "../catalogo";
import { sembrar } from "../db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "../db/test-utils";
import { leerTranscripcion } from "../transcripciones";
import type { Modulo } from "../types";
import { temarioDeTranscripciones, temarioDelModulo } from "./temario";

const modulo: Modulo = {
  id: "m2-css",
  titulo: "CSS",
  descripcion: "",
  ordenSugerido: 2,
  conceptos: [],
  videos: [
    { id: "v04", titulo: "Especificidad", youtubeId: "", duracionSegundos: 972 },
    { id: "v05", titulo: "Caja", youtubeId: "", duracionSegundos: 257 },
    { id: "v06", titulo: "Unidades", youtubeId: "", duracionSegundos: 695 },
  ],
};

describe("temarioDeTranscripciones", () => {
  it("una cabecera por vídeo, en el orden del módulo, y una marca [vídeo @segundo] por bloque de ~30 s", () => {
    const transcripciones = new Map([
      ["v05", "## Vídeo v05: Caja\n\n[00:00] Padding\n[00:10] dentro.\n[01:30] Margin fuera.\n"],
      ["v04", "## Vídeo v04: Especificidad\n\n[00:01] Un id gana.\n"],
    ]);
    expect(temarioDeTranscripciones(modulo, transcripciones)).toBe(
      ["### Vídeo v04: Especificidad", "[v04 @1] Un id gana.", "### Vídeo v05: Caja", "[v05 @0] Padding dentro.", "[v05 @90] Margin fuera."].join("\n"),
    );
  });

  it("sin transcripciones (o vacías) el temario está vacío: los agentes lo tratan como «sin contenido»", () => {
    expect(temarioDeTranscripciones(modulo, new Map())).toBe("");
    expect(temarioDeTranscripciones(modulo, new Map([["v04", "## Vídeo v04: Especificidad\n\n"]]))).toBe("");
  });
});

const hayBd = await bdPruebasDisponible();

describe.skipIf(!hayBd)("temarioDelModulo desde la BBDD (con BBDD real)", () => {
  let bd: BdPrueba;
  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  /** El temario que se montaba leyendo los VTT del disco, para comprobar que la IA recibe lo mismo que antes. */
  function temarioDeLosFicheros(m: Modulo): string {
    return m.videos
      .filter((v) => v.transcripcion)
      .flatMap((v) => [
        `### Vídeo ${v.id}: ${v.titulo}`,
        ...leerTranscripcion(v.transcripcion as string).map((f) => `[${v.id} @${f.inicio}] ${f.texto.replace(/\s+/g, " ").trim()}`),
      ])
      .join("\n");
  }

  it("lee las transcripciones de documento y da el mismo temario que daban los ficheros", async () => {
    for (const id of ["m1-html", "m2-css", "m3-responsive", "m4-javascript"]) {
      const m = getModulo(id)!;
      const temario = await temarioDelModulo(m, bd.db);
      expect(temario.length, id).toBeGreaterThan(1000);
      expect(temario, id).toBe(temarioDeLosFicheros(m));
    }
  });

  it("un módulo que no está en la BBDD no tiene temario", async () => {
    expect(await temarioDelModulo({ ...modulo, id: "m9-inventado" }, bd.db)).toBe("");
  });
});
