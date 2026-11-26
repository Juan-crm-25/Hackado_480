import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { comentarioForo, curso, modulo, puntoForo, temaForo, usuario } from "@/lib/db/schema";
import { EMAIL_IA_FORO } from "@/lib/db/seed/datos";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { ErrorValidadorForo, type ResultadoValidacionForo } from "@/lib/agentes/validador-foro";
import type { UsuarioSesion } from "../auth/roles";
import {
  crearComentario,
  crearTema,
  darPuntos,
  listarTemas,
  obtenerHilo,
  quitarPuntos,
  validarComoProfesor,
  validarYResponder,
  type ComentarioHilo,
  type DependenciasForo,
} from "./servicio";

const hayBd = await bdPruebasDisponible();

const CURSO = "desarrollo-web";
const MODULO = "m2-css";

describe.skipIf(!hayBd)("foro, H10 (con BBDD real)", () => {
  let bd: BdPrueba;
  let carmen: UsuarioSesion; // alumna, autora de las dudas
  let javier: UsuarioSesion; // alumno que responde
  let profesora: UsuarioSesion; // profesora del curso
  let admin: UsuarioSesion;
  let otraProfe: UsuarioSesion; // rol profesor, pero no de este curso
  let fuera: UsuarioSesion; // alumno sin el curso
  let senseiId: string;
  let tareas: (() => Promise<void>)[];
  let validar: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<ResultadoValidacionForo>>>;
  let deps: DependenciasForo;

  const sesion = async (email: string): Promise<UsuarioSesion> => {
    const [u] = await bd.db.select().from(usuario).where(eq(usuario.email, email));
    return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, emailVerificado: u.emailVerificado };
  };
  const ejecutarTareas = async () => {
    const pendientes = tareas;
    tareas = [];
    for (const t of pendientes) await t();
  };
  const comentario = async (id: string) => (await bd.db.select().from(comentarioForo).where(eq(comentarioForo.id, id)))[0];
  const respuestasA = (id: string) => bd.db.select().from(comentarioForo).where(eq(comentarioForo.respuestaAId, id));
  const nuevaDuda = () => crearTema(carmen, CURSO, MODULO, { titulo: "¿Qué gana, un id o una clase?", cuerpo: "No entiendo la especificidad" }, bd.db);
  const responder = (u: UsuarioSesion, temaId: string, cuerpo = "Gana el id porque pesa más en la especificidad", respuestaAId?: string) =>
    crearComentario(u, temaId, { cuerpo, respuestaAId }, bd.db, deps);

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    carmen = await sesion("carmen@demo.test");
    javier = await sesion("javier@demo.test");
    profesora = await sesion("profesora@demo.test");
    admin = await sesion("admin@demo.test");
    senseiId = (await sesion(EMAIL_IA_FORO)).id;
    await bd.db.insert(usuario).values([
      { nombre: "Otra Profe", email: "otra.profe@demo.test", rol: "profesor", emailVerificado: true, seudonimo: "profesor_otra_h10" },
      { nombre: "Fuera", email: "fuera@demo.test", rol: "alumno", emailVerificado: true, seudonimo: "alumno_fuera_h10" },
    ]);
    otraProfe = await sesion("otra.profe@demo.test");
    fuera = await sesion("fuera@demo.test");
  });
  afterAll(async () => {
    await bd?.borrar();
  });
  beforeEach(async () => {
    await bd.db.delete(temaForo);
    tareas = [];
    validar = vi.fn(async () => ({ tipo: "respuesta", valoracion: "correcta" }) as ResultadoValidacionForo);
    deps = {
      validar: validar as unknown as DependenciasForo["validar"],
      programar: (t) => void tareas.push(t),
      ahora: () => new Date(),
      reintentos: new Map(),
    };
  });

  describe("temas", () => {
    it("crea un tema en el módulo y lo lista (más nuevo primero) con autor y número de comentarios", async () => {
      const primero = await nuevaDuda();
      const segundo = await crearTema(javier, CURSO, MODULO, { titulo: "Flexbox o grid", cuerpo: "¿Cuál uso?" }, bd.db);
      await responder(javier, primero.id);

      const temas = await listarTemas(carmen, CURSO, MODULO, bd.db);
      expect(temas.map((t) => t.id)).toEqual([segundo.id, primero.id]);
      expect(temas[1]).toMatchObject({
        titulo: "¿Qué gana, un id o una clase?",
        comentarios: 1,
        autor: { nombre: "Carmen López", esIa: false, esProfesor: false },
      });
      const [fila] = await bd.db.select().from(temaForo).where(eq(temaForo.id, primero.id));
      const [m] = await bd.db.select().from(modulo).innerJoin(curso, eq(curso.id, modulo.cursoId)).where(and(eq(modulo.slug, MODULO), eq(curso.slug, CURSO)));
      expect(fila.moduloId).toBe(m.modulo.id);
    });

    it("sin el curso: 403; módulo o curso que no existe: 404", async () => {
      await expect(listarTemas(fuera, CURSO, MODULO, bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(crearTema(fuera, CURSO, MODULO, { titulo: "Hola", cuerpo: "x" }, bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(listarTemas(carmen, CURSO, "no-existe", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
      await expect(listarTemas(carmen, "no-existe", MODULO, bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    });

    it("el admin entra en cualquier curso sin matrícula", async () => {
      await nuevaDuda();
      expect(await listarTemas(admin, CURSO, MODULO, bd.db)).toHaveLength(1);
    });
  });

  describe("comentarios e hilo", () => {
    it("el comentario se guarda pendiente y la valoración se programa (no se espera a la IA)", async () => {
      const tema = await nuevaDuda();
      const c = await responder(javier, tema.id);
      expect(c).toMatchObject({ validacion: "pendiente", validadoPor: null, puntos: 0 });
      expect(validar).not.toHaveBeenCalled();
      expect(tareas).toHaveLength(1);
    });

    it("respuestaAId de otro tema: 400; tema que no existe o id mal formado: 404; sin el curso: 403", async () => {
      const tema = await nuevaDuda();
      const otro = await crearTema(javier, CURSO, MODULO, { titulo: "Otro tema", cuerpo: "x" }, bd.db);
      const deOtro = await responder(carmen, otro.id);
      await expect(responder(javier, tema.id, "texto", deOtro.id)).rejects.toMatchObject({ codigo: "DATOS_INVALIDOS" });
      await expect(responder(javier, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
      await expect(responder(javier, "no-es-un-id")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
      await expect(responder(fuera, tema.id)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(obtenerHilo(fuera, tema.id, bd.db, deps)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(obtenerHilo(carmen, "00000000-0000-0000-0000-000000000000", bd.db, deps)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    });

    it("el hilo es un árbol con autores (Sensei es IA, la profesora es profesora), puntos y sin emails", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      await ejecutarTareas(); // correcta → Sensei contesta
      const p = await responder(profesora, tema.id, "Muy bien explicado", r.id);
      await darPuntos(profesora, { comentarioId: r.id, puntos: 3, motivo: "buena_conducta" }, bd.db);
      await darPuntos(profesora, { temaId: tema.id, puntos: 6, motivo: "buena_pregunta" }, bd.db);

      const hilo = await obtenerHilo(carmen, tema.id, bd.db, deps);
      expect(JSON.stringify(hilo)).not.toMatch(/@/);
      expect(hilo.puedeDarPuntos).toBe(false);
      expect(hilo.tema).toMatchObject({ id: tema.id, autor: { nombre: "Carmen López" }, puntosProfesor: { puntos: 6, motivo: "buena_pregunta" } });
      expect(hilo.comentarios).toHaveLength(1);
      const raiz = hilo.comentarios[0];
      expect(raiz).toMatchObject({ id: r.id, validacion: "correcta", validadoPor: "ia", puntos: 10, puntosProfesor: { puntos: 3, motivo: "buena_conducta" } });
      const porAutor = (c: ComentarioHilo) => c.autor.nombre;
      expect(raiz.respuestas.map(porAutor).sort()).toEqual(["Ana Torres", "Sensei"]);
      const sensei = raiz.respuestas.find((c) => c.autor.nombre === "Sensei")!;
      expect(sensei.autor).toMatchObject({ esIa: true, esProfesor: false, imagenUrl: "/avatars/sensei.svg" });
      expect(raiz.respuestas.find((c) => c.id === p.id)!.autor).toMatchObject({ esIa: false, esProfesor: true });

      expect((await obtenerHilo(profesora, tema.id, bd.db, deps)).puedeDarPuntos).toBe(true);
      expect((await obtenerHilo(admin, tema.id, bd.db, deps)).puedeDarPuntos).toBe(true);
    });
  });

  describe("validarYResponder (S4–S7)", () => {
    it.each([
      ["correcta", "¡Genial, tú sí que sabes del tema!"],
      ["aproximada", "¡Me gusta cómo piensas, pero se puede afinar más!"],
      ["incorrecta", "Esta respuesta no es correcta, ¡sigue investigando!"],
    ] as const)("respuesta %s: guarda la valoración de la IA y Sensei contesta en el hilo", async (valoracion, frase) => {
      validar.mockResolvedValue({ tipo: "respuesta", valoracion });
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      await validarYResponder(r.id, bd.db, deps);

      expect(await comentario(r.id)).toMatchObject({ validacion: valoracion, validadoPor: "ia", profesorId: null, validadoEn: expect.any(Date) });
      const respuestas = await respuestasA(r.id);
      expect(respuestas).toEqual([expect.objectContaining({ temaId: tema.id, autorId: senseiId, cuerpo: frase, validacion: "pendiente" })]);
      expect(validar).toHaveBeenCalledWith(
        expect.objectContaining({
          duda: { titulo: "¿Qué gana, un id o una clase?", cuerpo: "No entiendo la especificidad" },
          comentario: "Gana el id porque pesa más en la especificidad",
          nombres: expect.arrayContaining(["Javier Sánchez", "Carmen López"]),
        }),
      );
    });

    it("no_respuesta: se marca sin puntos y Sensei no contesta", async () => {
      validar.mockResolvedValue({ tipo: "no_respuesta" });
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id, "¡Gracias por preguntar!");
      await validarYResponder(r.id, bd.db, deps);
      expect(await comentario(r.id)).toMatchObject({ validacion: "no_respuesta", validadoPor: "ia" });
      expect(await respuestasA(r.id)).toHaveLength(0);
    });

    it.each([
      ["dudosa", async () => ({ tipo: "dudosa" }) as ResultadoValidacionForo],
      ["error de la IA", async () => Promise.reject(new ErrorValidadorForo("caída"))],
    ])("%s: se queda pendiente y sin respuesta", async (_, impl) => {
      const consola = vi.spyOn(console, "error").mockImplementation(() => {});
      validar.mockImplementation(impl);
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      await validarYResponder(r.id, bd.db, deps);
      expect(await comentario(r.id)).toMatchObject({ validacion: "pendiente", validadoPor: null });
      expect(await respuestasA(r.id)).toHaveLength(0);
      consola.mockRestore();
    });

    it("no valora (ni llama a la IA) a un profesor, a un admin, al autor de la duda ni a Sensei", async () => {
      const tema = await nuevaDuda();
      const deProfesora = await responder(profesora, tema.id);
      const deAdmin = await responder(admin, tema.id);
      const deAutora = await responder(carmen, tema.id);
      const [deSensei] = await bd.db.insert(comentarioForo).values({ temaId: tema.id, autorId: senseiId, cuerpo: "¡Genial!" }).returning();
      for (const c of [deProfesora, deAdmin, deAutora, deSensei]) await validarYResponder(c.id, bd.db, deps);
      expect(validar).not.toHaveBeenCalled();
      for (const c of [deProfesora, deAdmin, deAutora, deSensei]) expect((await comentario(c.id)).validacion).toBe("pendiente");
    });

    it("no vuelve a valorar un comentario que ya no está pendiente", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      await validarComoProfesor(profesora, r.id, "incorrecta", bd.db);
      await validarYResponder(r.id, bd.db, deps);
      expect(validar).not.toHaveBeenCalled();
    });

    it("si el profesor decide mientras la IA piensa, la IA no lo pisa ni Sensei contesta", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      validar.mockImplementation(async () => {
        await validarComoProfesor(profesora, r.id, "aproximada", bd.db);
        return { tipo: "respuesta", valoracion: "correcta" };
      });
      await validarYResponder(r.id, bd.db, deps);
      expect(await comentario(r.id)).toMatchObject({ validacion: "aproximada", validadoPor: "profesor", profesorId: profesora.id });
      expect(await respuestasA(r.id)).toHaveLength(0);
    });
  });

  describe("reintento al abrir el tema", () => {
    const envejecer = (id: string, minutos: number) =>
      bd.db.update(comentarioForo).set({ creado: new Date(Date.now() - minutos * 60_000) }).where(eq(comentarioForo.id, id));

    it("valora como mucho 5 pendientes de hace más de 10 minutos, los más antiguos primero, y una vez cada 10 minutos", async () => {
      const tema = await nuevaDuda();
      const ids: string[] = [];
      for (let i = 0; i < 7; i++) {
        const c = await responder(javier, tema.id, `Respuesta número ${i} con bastante texto`);
        await envejecer(c.id, 60 - i); // el 0 es el más antiguo
        ids.push(c.id);
      }
      const reciente = await responder(javier, tema.id, "Esta es reciente y no se reintenta");
      const deProfesora = await responder(profesora, tema.id);
      await envejecer(deProfesora.id, 120);
      tareas = [];

      await obtenerHilo(carmen, tema.id, bd.db, deps);
      expect(tareas).toHaveLength(1);
      await ejecutarTareas();
      const valorados = validar.mock.calls.map((c) => (c[0] as { comentario: string }).comentario);
      expect(valorados).toEqual([0, 1, 2, 3, 4].map((i) => `Respuesta número ${i} con bastante texto`));
      expect((await comentario(reciente.id)).validacion).toBe("pendiente");

      await obtenerHilo(carmen, tema.id, bd.db, deps);
      expect(tareas).toHaveLength(0); // dentro de los 10 minutos no se reintenta

      deps.ahora = () => new Date(Date.now() + 11 * 60_000);
      await obtenerHilo(carmen, tema.id, bd.db, deps);
      expect(tareas).toHaveLength(1);
    });
  });

  describe("validación del profesor", () => {
    it("el profesor del curso valora y siempre prevalece sobre la IA", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      await validarYResponder(r.id, bd.db, deps); // IA: correcta
      const resultado = await validarComoProfesor(profesora, r.id, "incorrecta", bd.db);
      expect(resultado).toMatchObject({ id: r.id, validacion: "incorrecta", validadoPor: "profesor", puntos: 0 });
      expect(await comentario(r.id)).toMatchObject({ validacion: "incorrecta", validadoPor: "profesor", profesorId: profesora.id });
      await validarComoProfesor(admin, r.id, "correcta", bd.db);
      expect(await comentario(r.id)).toMatchObject({ validacion: "correcta", profesorId: admin.id });
    });

    it("un alumno o un profesor de otro curso: 403; comentario de Sensei o de un profesor: 403; inexistente: 404", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      await expect(validarComoProfesor(carmen, r.id, "correcta", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(validarComoProfesor(otraProfe, r.id, "correcta", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      const deProfesora = await responder(profesora, tema.id);
      await expect(validarComoProfesor(profesora, deProfesora.id, "correcta", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      const [deSensei] = await bd.db.insert(comentarioForo).values({ temaId: tema.id, autorId: senseiId, cuerpo: "¡Genial!" }).returning();
      await expect(validarComoProfesor(profesora, deSensei.id, "correcta", bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(validarComoProfesor(profesora, "00000000-0000-0000-0000-000000000000", "correcta", bd.db)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
      expect((await comentario(r.id)).validacion).toBe("pendiente");
    });
  });

  describe("puntos del profesor (S8)", () => {
    it("da +1/+3/+6 a un tema o comentario de un alumno; cambiarlos los sustituye y quitarlos los borra", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      expect(await darPuntos(profesora, { temaId: tema.id, puntos: 1, motivo: "buena_pregunta" }, bd.db)).toEqual({ puntos: 1, motivo: "buena_pregunta" });
      await darPuntos(profesora, { temaId: tema.id, puntos: 6, motivo: "buena_conducta" }, bd.db);
      await darPuntos(admin, { comentarioId: r.id, puntos: 3, motivo: "buena_conducta" }, bd.db);

      const filas = await bd.db.select().from(puntoForo);
      expect(filas).toHaveLength(2);
      expect(filas.find((f) => f.temaId === tema.id)).toMatchObject({ alumnoId: carmen.id, puntos: 6, motivo: "buena_conducta", profesorId: profesora.id });
      expect(filas.find((f) => f.comentarioId === r.id)).toMatchObject({ alumnoId: javier.id, puntos: 3, profesorId: admin.id });

      await quitarPuntos(profesora, { temaId: tema.id }, bd.db);
      expect(await bd.db.select().from(puntoForo)).toEqual([expect.objectContaining({ comentarioId: r.id })]);
    });

    it("no se dan a Sensei, a un profesor (ni a uno mismo); un alumno o un profesor de otro curso: 403; destino inexistente: 404", async () => {
      const tema = await nuevaDuda();
      const r = await responder(javier, tema.id);
      const deProfesora = await responder(profesora, tema.id);
      const [deSensei] = await bd.db.insert(comentarioForo).values({ temaId: tema.id, autorId: senseiId, cuerpo: "¡Genial!" }).returning();
      const dar = (u: UsuarioSesion, comentarioId: string) => darPuntos(u, { comentarioId, puntos: 3, motivo: "buena_conducta" }, bd.db);
      await expect(dar(profesora, deProfesora.id)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(dar(profesora, deSensei.id)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(dar(carmen, r.id)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(dar(otraProfe, r.id)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(quitarPuntos(carmen, { comentarioId: r.id }, bd.db)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
      await expect(dar(profesora, "00000000-0000-0000-0000-000000000000")).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
      expect(await bd.db.select().from(puntoForo)).toHaveLength(0);
    });
  });
});
