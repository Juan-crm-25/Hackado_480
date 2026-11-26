import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DudaHumanaProfesor } from "@/lib/types";
import { DudasParaResponder } from "./dudas-para-responder";

const AHORA = new Date("2026-11-26T12:00:00Z");
const pendiente: DudaHumanaProfesor = {
  id: "d1",
  preguntaId: "p1",
  pregunta: "¿Por qué mi clase no gana a un id?",
  moduloId: "m2-css",
  creada: "2026-11-26T10:00:00Z",
  estado: "pendiente",
  alumno: "Carmen López",
  modulo: "CSS",
};
const respondida: DudaHumanaProfesor = {
  ...pendiente,
  id: "d2",
  pregunta: "¿Qué es rem?",
  estado: "respondida",
  respuesta: "Es relativa a la raíz.",
  respondida: "2026-11-26T11:00:00Z",
};
const pintar = (dudas: DudaHumanaProfesor[] | null) => renderToStaticMarkup(<DudasParaResponder dudasIniciales={dudas} ahora={AHORA} />);

describe("DudasParaResponder (Radar, H9)", () => {
  it("cuenta las pendientes en el título", () => {
    expect(pintar([pendiente, respondida])).toContain("Te han pedido ayuda (1)");
  });

  it("muestra cada duda pendiente con el alumno, el módulo, cuándo y un cuadro para responder", () => {
    const html = pintar([pendiente]);
    expect(html).toContain("Carmen López");
    expect(html).toContain("CSS");
    expect(html).toContain("hace 2 horas");
    expect(html).toContain("¿Por qué mi clase no gana a un id?");
    expect(html).toContain("Tu respuesta");
    expect(html).toContain("Responder");
  });

  it("las respondidas muestran la respuesta, con el estado en texto", () => {
    const html = pintar([respondida]);
    expect(html).toContain("Respondida");
    expect(html).toContain("Es relativa a la raíz.");
    expect(html).not.toContain("<textarea");
  });

  it("sin dudas lo dice, y si no se han podido cargar avisa con un error", () => {
    expect(pintar([])).toContain("Ningún alumno te ha pasado dudas");
    expect(pintar(null)).toContain('role="alert"');
  });
});
