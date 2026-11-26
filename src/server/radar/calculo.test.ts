import { describe, expect, it } from "vitest";
import { calcularRadar, type DatosRadar } from "./calculo";

const AHORA = new Date("2026-11-29T10:00:00Z");
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 24 * 3600 * 1000);

const modulos = [
  { slug: "m1-html", titulo: "HTML" },
  { slug: "m2-css", titulo: "CSS" },
];
const conceptos = {
  web: { conceptoSlug: "html-web", concepto: "Cómo funciona la web", moduloSlug: "m1-html" },
  esp: { conceptoSlug: "css-especificidad", concepto: "Selectores y especificidad", moduloSlug: "m2-css" },
  caja: { conceptoSlug: "css-caja", concepto: "Modelo de caja", moduloSlug: "m2-css" },
};
type Concepto = (typeof conceptos)[keyof typeof conceptos];

const intento = (usuarioId: string, c: Concepto, correcto: boolean, dias: number) => ({ usuarioId, ...c, correcto, fecha: hace(dias) });

function datos(extra: Partial<DatosRadar> = {}): DatosRadar {
  return {
    curso: { slug: "desarrollo-web", titulo: "Desarrollo web" },
    modulos,
    alumnos: [
      { usuarioId: "ana", nombre: "Ana" },
      { usuarioId: "bea", nombre: "Bea" },
      { usuarioId: "carlos", nombre: "Carlos" },
      { usuarioId: "dani", nombre: "Dani" },
    ],
    intentos: [],
    dudas: [],
    ...extra,
  };
}

describe("calcularRadar: alumnos atascados", () => {
  it("avisa de 3 fallos seguidos en un concepto si el último es de la última semana", () => {
    const informe = calcularRadar(
      datos({
        intentos: [
          intento("ana", conceptos.esp, true, 6),
          intento("ana", conceptos.esp, false, 3),
          intento("ana", conceptos.esp, false, 2),
          intento("ana", conceptos.esp, false, 1),
        ],
      }),
      AHORA,
    );
    expect(informe.alertas).toEqual([
      {
        alumnoId: "ana",
        nombre: "Ana",
        motivo: "fallos_repetidos",
        moduloId: "m2-css",
        conceptoId: "css-especificidad",
        detalle: "3 fallos seguidos en «Selectores y especificidad»",
        fecha: hace(1).toISOString(),
      },
    ]);
  });

  it("no avisa si el último intento es un acierto o si los fallos son antiguos", () => {
    const informe = calcularRadar(
      datos({
        intentos: [
          ...[3, 2, 1].map((d) => intento("ana", conceptos.esp, false, d + 1)),
          intento("ana", conceptos.esp, true, 0.5), // ya lo ha superado
          ...[12, 11, 10].map((d) => intento("bea", conceptos.esp, false, d)), // hace más de una semana (será inactiva)
          intento("carlos", conceptos.esp, false, 2),
          intento("carlos", conceptos.esp, false, 1), // solo 2 fallos
        ],
      }),
      AHORA,
    );
    expect(informe.alertas.filter((a) => a.motivo === "fallos_repetidos")).toEqual([]);
  });

  it("cuenta los fallos seguidos de verdad (4 o más) y los separa por concepto", () => {
    const informe = calcularRadar(
      datos({
        intentos: [
          ...[4, 3, 2, 1].map((d) => intento("ana", conceptos.esp, false, d)),
          ...[3, 2, 1].map((d) => intento("ana", conceptos.caja, d !== 2, d)), // fallo suelto: no
        ],
      }),
      AHORA,
    );
    const fallos = informe.alertas.filter((a) => a.motivo === "fallos_repetidos");
    expect(fallos.map((a) => [a.conceptoId, a.detalle])).toEqual([["css-especificidad", "4 fallos seguidos en «Selectores y especificidad»"]]);
  });
});

describe("calcularRadar: alumnos inactivos", () => {
  it("avisa de quien no ha hecho nada en más de 7 días, con el módulo donde lo dejó", () => {
    const informe = calcularRadar(
      datos({
        intentos: [intento("bea", conceptos.esp, true, 12), intento("bea", conceptos.web, true, 13), intento("carlos", conceptos.web, true, 2)],
        dudas: [{ usuarioId: "carlos", moduloSlug: "m1-html", texto: "¿Qué es el doctype?", fecha: hace(9) }],
      }),
      AHORA,
    );
    expect(informe.alertas).toEqual([
      {
        alumnoId: "bea",
        nombre: "Bea",
        motivo: "inactividad",
        moduloId: "m2-css",
        detalle: "Sin actividad desde hace 12 días",
        fecha: hace(12).toISOString(),
      },
    ]);
  });

  it("no avisa de quien aún no ha empezado (no hay nada que retomar)", () => {
    expect(calcularRadar(datos(), AHORA).alertas).toEqual([]);
  });

  it("ordena: primero los atascados (el más reciente antes) y después los inactivos (el que más tiempo lleva antes)", () => {
    const informe = calcularRadar(
      datos({
        intentos: [
          ...[3, 2, 1.5].map((d) => intento("ana", conceptos.esp, false, d)),
          ...[3, 2, 0.5].map((d) => intento("carlos", conceptos.caja, false, d)),
          intento("bea", conceptos.web, true, 9),
          intento("dani", conceptos.web, true, 14),
        ],
      }),
      AHORA,
    );
    expect(informe.alertas.map((a) => `${a.motivo}:${a.alumnoId}`)).toEqual([
      "fallos_repetidos:carlos",
      "fallos_repetidos:ana",
      "inactividad:dani",
      "inactividad:bea",
    ]);
  });
});

describe("calcularRadar: conceptos más fallados", () => {
  it("ordena por porcentaje de fallo de los últimos 30 días, con al menos 5 intentos", () => {
    const informe = calcularRadar(
      datos({
        alumnos: Array.from({ length: 10 }, (_, i) => ({ usuarioId: `u${i}`, nombre: `Alumno ${i}` })),
        intentos: [
          ...Array.from({ length: 10 }, (_, i) => intento(`u${i}`, conceptos.esp, i >= 6, 2)), // 60 % de fallo
          ...Array.from({ length: 5 }, (_, i) => intento(`u${i}`, conceptos.caja, i !== 0, 2)), // 20 %
          ...Array.from({ length: 4 }, (_, i) => intento(`u${i}`, conceptos.web, false, 2)), // 100 %, pero solo 4 intentos
          ...Array.from({ length: 5 }, (_, i) => intento(`u${i}`, conceptos.caja, false, 40)), // antiguos: no cuentan
        ],
      }),
      AHORA,
    );
    expect(informe.conceptosMasFallados).toEqual([
      { moduloId: "m2-css", conceptoId: "css-especificidad", concepto: "Selectores y especificidad", porcentajeFallo: 0.6, intentos: 10 },
      { moduloId: "m2-css", conceptoId: "css-caja", concepto: "Modelo de caja", porcentajeFallo: 0.2, intentos: 5 },
    ]);
  });
});

describe("calcularRadar: dudas frecuentes", () => {
  it("agrupa por módulo las dudas de las 2 últimas semanas y destaca las que más se repiten", () => {
    const duda = (texto: string, moduloSlug: string, dias = 1) => ({ usuarioId: "ana", moduloSlug, texto, fecha: hace(dias) });
    const informe = calcularRadar(
      datos({
        dudas: [
          duda("¿Un id gana a una clase?", "m2-css"),
          duda("¿un id gana a una clase? ", "m2-css"), // la misma, con otras mayúsculas y espacios
          duda("¿Qué es rem?", "m2-css"),
          duda("¿Qué es el doctype?", "m1-html"),
          duda("Muy antigua", "m1-html", 20),
        ],
      }),
      AHORA,
    );
    expect(informe.dudasFrecuentes).toEqual([
      {
        moduloId: "m2-css",
        modulo: "CSS",
        total: 3,
        masRepetidas: [
          { texto: "¿Un id gana a una clase?", veces: 2 },
          { texto: "¿Qué es rem?", veces: 1 },
        ],
      },
      { moduloId: "m1-html", modulo: "HTML", total: 1, masRepetidas: [{ texto: "¿Qué es el doctype?", veces: 1 }] },
    ]);
  });
});

describe("calcularRadar: solo alumnos del curso", () => {
  it("ignora la actividad de quien no es alumno del curso (p. ej., la profesora probando)", () => {
    const informe = calcularRadar(
      datos({ intentos: [...[3, 2, 1].map((d) => intento("profesora", conceptos.esp, false, d)), ...Array.from({ length: 5 }, () => intento("profesora", conceptos.esp, false, 1))] }),
      AHORA,
    );
    expect(informe.alertas).toEqual([]);
    expect(informe.conceptosMasFallados).toEqual([]);
  });
});

describe("calcularRadar: cabecera del informe", () => {
  it("lleva el curso, cuántos alumnos tiene, la fecha y el resumen vacío (lo escribirá el analista)", () => {
    const informe = calcularRadar(datos(), AHORA);
    expect(informe).toMatchObject({
      curso: { slug: "desarrollo-web", titulo: "Desarrollo web" },
      alumnos: 4,
      modulos: [
        { id: "m1-html", titulo: "HTML" },
        { id: "m2-css", titulo: "CSS" },
      ],
      generado: AHORA.toISOString(),
      resumenDudas: "",
    });
  });
});
