import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { InformeRadar } from "@/lib/types";
import { VistaRadar } from "./vista-radar";

const AHORA = new Date("2026-11-29T10:00:00Z");

const informe: InformeRadar = {
  curso: { slug: "desarrollo-web", titulo: "Introducción al desarrollo web" },
  generado: AHORA.toISOString(),
  alumnos: 30,
  modulos: [
    { id: "m1-html", titulo: "HTML" },
    { id: "m2-css", titulo: "CSS" },
  ],
  alertas: [
    {
      alumnoId: "u1",
      nombre: "Alba Ruiz",
      motivo: "fallos_repetidos",
      moduloId: "m2-css",
      conceptoId: "css-especificidad",
      detalle: "3 fallos seguidos en «Selectores y especificidad»",
      fecha: "2026-11-28T10:00:00Z",
    },
    { alumnoId: "u2", nombre: "Fernando Gil", motivo: "inactividad", moduloId: "m1-html", detalle: "Sin actividad desde hace 12 días", fecha: "2026-11-17T10:00:00Z" },
  ],
  conceptosMasFallados: [
    { moduloId: "m2-css", conceptoId: "css-especificidad", concepto: "Selectores y especificidad", porcentajeFallo: 0.6, intentos: 78 },
  ],
  dudasFrecuentes: [
    { moduloId: "m2-css", modulo: "CSS", total: 12, masRepetidas: [{ texto: "¿Un id gana a una clase?", veces: 6 }] },
  ],
  resumenDudas: "",
};

const pintar = (i: InformeRadar = informe) => renderToStaticMarkup(<VistaRadar informe={i} ahora={AHORA} />);

describe("VistaRadar", () => {
  it("muestra el curso y cuántos alumnos tiene", () => {
    const html = pintar();
    expect(html).toContain("Introducción al desarrollo web");
    expect(html).toContain("30 alumnos");
  });

  it("lista a quién ayudar, con el motivo en TEXTO (no solo color), el módulo y cuándo", () => {
    const html = pintar();
    expect(html).toContain("Necesitan ayuda (2)");
    expect(html).toContain("Alba Ruiz");
    expect(html).toContain("Atascado");
    expect(html).toContain("3 fallos seguidos en «Selectores y especificidad»");
    expect(html).toContain("Fernando Gil");
    expect(html).toContain("Inactivo");
    expect(html).toContain("CSS");
    expect(html).toContain("hace 1 día");
  });

  it("muestra los conceptos más fallados con el porcentaje escrito y los intentos", () => {
    const html = pintar();
    expect(html).toContain("Selectores y especificidad");
    expect(html).toContain("60 % de fallos");
    expect(html).toContain("78 intentos");
  });

  it("muestra las dudas más repetidas por módulo", () => {
    const html = pintar();
    expect(html).toContain("12 preguntas");
    expect(html).toContain("¿Un id gana a una clase?");
    expect(html).toContain("6 veces");
  });

  it("con todo vacío, lo dice en cada apartado en vez de dejarlo en blanco", () => {
    const html = pintar({ ...informe, alertas: [], conceptosMasFallados: [], dudasFrecuentes: [] });
    expect(html).toContain("Nadie necesita ayuda ahora mismo");
    expect(html).toContain("Aún no hay intentos suficientes");
    expect(html).toContain("Aún no hay preguntas al tutor");
  });
});
