import { describe, expect, it } from "vitest";
import { ALUMNOS_SIMULADOS, construirActividad, type EntradaActividad } from "./actividad";

const AHORA = new Date("2026-11-29T10:00:00Z");
const DIA = 24 * 3600 * 1000;

const CONCEPTOS = [
  ["m1", "html-web"],
  ["m1", "html-estructura"],
  ["m1", "html-semantica"],
  ["m2", "css-especificidad"],
  ["m2", "css-caja"],
  ["m2", "css-unidades"],
  ["m3", "resp-flexbox"],
  ["m3", "resp-grid"],
  ["m3", "resp-media"],
  ["m4", "js-basico"],
  ["m4", "js-dom"],
  ["m4", "js-eventos"],
].map(([moduloId, slug]) => ({ id: `c-${slug}`, slug, moduloId }));

/** Dos ejercicios tipo test por concepto (solución: opción 1). */
const EJERCICIOS = CONCEPTOS.flatMap((c) =>
  [1, 2].map((n) => ({
    id: `e-${c.slug}-${n}`,
    conceptoId: c.id,
    tipo: "test" as const,
    opciones: ["a", "b", "c"],
    solucion: 1,
    claseId: `clase-${c.moduloId}`,
    segundoReferencia: 30 * n,
  })),
);

const entrada = (extra: Partial<EntradaActividad> = {}): EntradaActividad => ({
  ahora: AHORA,
  alumnos: Array.from({ length: 28 }, (_, i) => ({ usuarioId: `u${i}`, email: `alumno${i}@demo.test` })),
  conceptos: CONCEPTOS,
  ejercicios: EJERCICIOS,
  ...extra,
});

const tasaFallo = (actividad: ReturnType<typeof construirActividad>, slug: string) => {
  const delConcepto = actividad.intentos.filter((i) => i.ejercicioId.startsWith(`e-${slug}-`));
  return delConcepto.filter((i) => !i.correcto).length / delConcepto.length;
};

describe("ALUMNOS_SIMULADOS", () => {
  it("son 20, con emails únicos en minúsculas y de prueba (.test)", () => {
    expect(ALUMNOS_SIMULADOS).toHaveLength(20);
    const emails = ALUMNOS_SIMULADOS.map((a) => a.email);
    expect(new Set(emails).size).toBe(20);
    for (const email of emails) expect(email).toMatch(/^[a-z0-9.]+@[a-z.]+\.test$/);
  });
});

describe("construirActividad", () => {
  it("es determinista: la misma entrada da siempre la misma actividad", () => {
    expect(construirActividad(entrada())).toEqual(construirActividad(entrada()));
  });

  it.each([2, 3])("la especificidad es el concepto que más se falla (en torno al 60 %), con %i ejercicios por concepto", (porConcepto) => {
    const ejercicios = CONCEPTOS.flatMap((c) =>
      Array.from({ length: porConcepto }, (_, n) => ({ ...EJERCICIOS[0], id: `e-${c.slug}-${n + 1}`, conceptoId: c.id })),
    );
    const actividad = construirActividad(entrada({ ejercicios }));
    const especificidad = tasaFallo(actividad, "css-especificidad");
    expect(especificidad).toBeGreaterThan(0.5);
    expect(especificidad).toBeLessThan(0.75);
    for (const otro of CONCEPTOS.filter((c) => c.slug !== "css-especificidad")) {
      expect(tasaFallo(actividad, otro.slug)).toBeLessThan(especificidad);
    }
  });

  it("hay alumnos atascados: 3 fallos seguidos en un mismo concepto en los últimos 3 días", () => {
    const { intentos } = construirActividad(entrada());
    const atascados = new Set<string>();
    for (const usuarioId of new Set(intentos.map((i) => i.usuarioId))) {
      const porConcepto = new Map<string, typeof intentos>();
      for (const i of intentos.filter((x) => x.usuarioId === usuarioId)) {
        const concepto = i.ejercicioId.replace(/-\d+$/, "");
        porConcepto.set(concepto, [...(porConcepto.get(concepto) ?? []), i]);
      }
      for (const lista of porConcepto.values()) {
        const ultimos = [...lista].sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).slice(-3);
        if (ultimos.length === 3 && ultimos.every((i) => !i.correcto && AHORA.getTime() - i.fecha.getTime() <= 3 * DIA)) {
          atascados.add(usuarioId);
        }
      }
    }
    expect(atascados.size).toBeGreaterThanOrEqual(3);
  });

  it("hay alumnos inactivos: sin actividad en los últimos 9 días", () => {
    const actividad = construirActividad(entrada());
    const ultima = new Map<string, number>();
    const anotar = (usuarioId: string, fecha: Date) => ultima.set(usuarioId, Math.max(ultima.get(usuarioId) ?? 0, fecha.getTime()));
    for (const i of actividad.intentos) anotar(i.usuarioId, i.fecha);
    for (const c of actividad.conversaciones) for (const m of c.mensajes) anotar(c.usuarioId, m.fecha);
    const inactivos = [...ultima.values()].filter((t) => AHORA.getTime() - t >= 9 * DIA);
    expect(inactivos.length).toBeGreaterThanOrEqual(3);
  });

  it("todas las fechas están en las últimas dos semanas y nunca en el futuro", () => {
    const actividad = construirActividad(entrada());
    const fechas = [
      ...actividad.intentos.map((i) => i.fecha),
      ...actividad.conversaciones.flatMap((c) => [c.creada, ...c.mensajes.map((m) => m.fecha)]),
      ...actividad.progresos.map((p) => p.actualizado),
    ];
    for (const f of fechas) {
      expect(f.getTime()).toBeLessThanOrEqual(AHORA.getTime());
      expect(AHORA.getTime() - f.getTime()).toBeLessThanOrEqual(15 * DIA);
    }
  });

  it("los intentos son coherentes: correcto ↔ puntuación, y si falla dice qué repasar", () => {
    for (const i of construirActividad(entrada()).intentos) {
      expect(i.puntuacion).toBe(i.correcto ? 1 : 0);
      const ejercicio = EJERCICIOS.find((e) => e.id === i.ejercicioId)!;
      expect(i.respuesta === ejercicio.solucion).toBe(i.correcto);
      if (i.correcto) expect(i.repasarClaseId).toBeNull();
      else expect({ clase: i.repasarClaseId, segundo: i.repasarSegundo }).toEqual({ clase: ejercicio.claseId, segundo: ejercicio.segundoReferencia });
    }
  });

  it("sin ejercicios de un concepto no inventa intentos de ese concepto", () => {
    const sinDom = EJERCICIOS.filter((e) => e.conceptoId !== "c-js-dom");
    const { intentos } = construirActividad(entrada({ ejercicios: sinDom }));
    expect(intentos.some((i) => i.ejercicioId.startsWith("e-js-dom"))).toBe(false);
    expect(intentos.length).toBeGreaterThan(0);
  });

  it("las dudas al tutor son de los conceptos que se fallan, ya filtradas y sin datos personales", () => {
    const { conversaciones } = construirActividad(entrada());
    const preguntas = conversaciones.flatMap((c) => c.mensajes.filter((m) => m.rol === "alumno").map((m) => m.texto));
    expect(preguntas.length).toBeGreaterThanOrEqual(20);
    expect(preguntas.join(" ")).not.toMatch(/@|\d{9}/);
    // Cada pregunta del alumno va seguida de la respuesta del tutor.
    for (const c of conversaciones) {
      c.mensajes.forEach((m, i) => expect(m.rol).toBe(i % 2 === 0 ? "alumno" : "tutor"));
    }
    // La especificidad (m2) es de lo que más se pregunta.
    const delModulo = (id: string) => conversaciones.filter((c) => c.moduloId === id).length;
    expect(delModulo("m2")).toBeGreaterThan(delModulo("m1"));
  });

  it("el progreso refleja los intentos: aciertos por concepto entre 0 y 1", () => {
    const { intentos, progresos } = construirActividad(entrada());
    expect(progresos.length).toBeGreaterThan(0);
    for (const p of progresos) {
      for (const [slug, valor] of Object.entries(p.aciertosPorConcepto)) {
        expect(valor).toBeGreaterThanOrEqual(0);
        expect(valor).toBeLessThanOrEqual(1);
        const suyos = intentos.filter((i) => i.usuarioId === p.usuarioId && i.ejercicioId.startsWith(`e-${slug}-`));
        expect(valor).toBeCloseTo(suyos.filter((i) => i.correcto).length / suyos.length, 2);
      }
    }
  });
});
