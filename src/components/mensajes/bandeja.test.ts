import { describe, expect, it } from "vitest";
import { conversacionesDemo } from "@/lib/demo/mensajes";
import { estadoInicial, reducirBandeja } from "./bandeja";

const ana = conversacionesDemo.find((c) => c.nombre === "Ana Torres")!;
const HORA = "2026-11-26T10:00:00.000Z";

describe("estado de la bandeja (simulación del MVP)", () => {
  it("empieza cerrada, sin conversación abierta y con los mensajes de ejemplo", () => {
    const e = estadoInicial();
    expect(e.abierta).toBe(false);
    expect(e.activa).toBeNull();
    expect(e.conversaciones).toEqual(conversacionesDemo);
  });

  it("abrir una conversación abre la bandeja en ella y la marca como leída", () => {
    const e = reducirBandeja(estadoInicial(), { tipo: "abrir", id: ana.id });
    expect(e.abierta).toBe(true);
    expect(e.activa).toBe(ana.id);
    expect(e.conversaciones.find((c) => c.id === ana.id)!.noLeidos).toBe(0);
  });

  it("abrir una conversación que no existe la crea vacía con ese nombre", () => {
    const e = reducirBandeja(estadoInicial(), { tipo: "abrir", id: "nuevo", nombre: "Pepe Ruiz", rol: "Profesor" });
    const c = e.conversaciones.find((x) => x.id === "nuevo")!;
    expect(c.nombre).toBe("Pepe Ruiz");
    expect(c.mensajes).toEqual([]);
    expect(e.activa).toBe("nuevo");
  });

  it("enviar añade mi mensaje al final con estado «enviado»", () => {
    const abierta = reducirBandeja(estadoInicial(), { tipo: "abrir", id: ana.id });
    const e = reducirBandeja(abierta, { tipo: "enviar", id: ana.id, texto: "  Hola, Ana  ", mensajeId: "m1", hora: HORA });
    const mensajes = e.conversaciones.find((c) => c.id === ana.id)!.mensajes;
    expect(mensajes).toHaveLength(ana.mensajes.length + 1);
    expect(mensajes.at(-1)).toEqual({ id: "m1", autor: "yo", texto: "Hola, Ana", hora: HORA, estado: "enviado" });
  });

  it("un mensaje vacío no se envía", () => {
    const antes = estadoInicial();
    expect(reducirBandeja(antes, { tipo: "enviar", id: ana.id, texto: "   ", mensajeId: "m1", hora: HORA })).toBe(antes);
  });

  it("volver a la lista quita la conversación activa; cerrar cierra y vuelve a la lista", () => {
    const abierta = reducirBandeja(estadoInicial(), { tipo: "abrir", id: ana.id });
    expect(reducirBandeja(abierta, { tipo: "lista" })).toMatchObject({ abierta: true, activa: null });
    expect(reducirBandeja(abierta, { tipo: "cerrar" })).toMatchObject({ abierta: false, activa: null });
    expect(reducirBandeja(estadoInicial(), { tipo: "abrir" })).toMatchObject({ abierta: true, activa: null });
  });
});
