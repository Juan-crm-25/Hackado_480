import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { curso, matricula, pedido } from "@/lib/db/schema";
import { sembrar } from "@/lib/db/seed/sembrar";
import { bdPruebasDisponible, crearBdPrueba, type BdPrueba } from "@/lib/db/test-utils";
import { registrar } from "../auth/servicio";
import type { UsuarioSesion } from "../auth/roles";
import { ErrorApp } from "../compartido/errores";
import { confirmarPago, confirmarPagoYMatricular, crearCheckout } from "./servicio";

const hayBd = await bdPruebasDisponible();

async function errorDe(promesa: Promise<unknown>): Promise<ErrorApp> {
  try {
    await promesa;
  } catch (e) {
    if (e instanceof ErrorApp) return e;
    throw e;
  }
  throw new Error("Se esperaba un ErrorApp");
}

const TARJETA = { numero: "1234", caducidad: "01/20", cvc: "1", titular: "Cualquiera" };

describe.skipIf(!hayBd)("servicio de pagos simulados (con BBDD real)", () => {
  let bd: BdPrueba;
  let comprador: UsuarioSesion;
  let otro: UsuarioSesion;
  let lucia: UsuarioSesion;

  beforeAll(async () => {
    bd = await crearBdPrueba();
    await sembrar(bd.db);
    comprador = (await registrar({ nombre: "Compradora", email: "compra@demo.test", contrasena: "segura123" }, bd.db)).usuario;
    otro = (await registrar({ nombre: "Otra", email: "otra@demo.test", contrasena: "segura123" }, bd.db)).usuario;
    const [fila] = await bd.db.query.usuario.findMany({ where: (u, { eq }) => eq(u.email, "lucia@demo.test") });
    lucia = { id: fila.id, nombre: fila.nombre, email: fila.email, rol: fila.rol, emailVerificado: fila.emailVerificado };
  });
  afterAll(async () => {
    await bd?.borrar();
  });

  describe("crearCheckout", () => {
    it("crea un pedido pendiente con el precio del curso en la BBDD y devuelve una sesión tipo Stripe", async () => {
      const sesion = await crearCheckout(comprador, { curso: "python-desde-cero" }, bd.db);

      expect(sesion).toMatchObject({
        object: "checkout.session",
        amount_total: 4900,
        currency: "eur",
        payment_status: "unpaid",
        curso: { slug: "python-desde-cero", titulo: expect.any(String) },
      });
      expect(sesion.id).toMatch(/^cs_test_[A-Za-z0-9]{24}$/);

      const [fila] = await bd.db.select().from(pedido).where(eq(pedido.stripeSessionId, sesion.id));
      expect(fila).toMatchObject({ usuarioId: comprador.id, importeCentimos: 4900, moneda: "eur", estado: "pendiente" });
    });

    it("si ya hay un pedido pendiente del mismo curso, reutiliza su sesión", async () => {
      const a = await crearCheckout(comprador, { curso: "ia-generativa-dia-a-dia" }, bd.db);
      const b = await crearCheckout(comprador, { curso: "ia-generativa-dia-a-dia" }, bd.db);
      expect(b.id).toBe(a.id);
    });

    it("un curso gratis también pasa por el checkout, con importe 0", async () => {
      const sesion = await crearCheckout(comprador, { curso: "costura-para-principiantes" }, bd.db);
      expect(sesion.amount_total).toBe(0);
    });

    it("con un curso que no existe responde 404", async () => {
      const error = await errorDe(crearCheckout(comprador, { curso: "no-existe" }, bd.db));
      expect(error.codigo).toBe("NO_ENCONTRADO");
    });

    it("con un curso no publicado responde 404", async () => {
      await bd.db.update(curso).set({ publicado: false }).where(eq(curso.slug, "oposiciones-auxiliar-administrativo"));
      const error = await errorDe(crearCheckout(comprador, { curso: "oposiciones-auxiliar-administrativo" }, bd.db));
      expect(error.codigo).toBe("NO_ENCONTRADO");
      await bd.db.update(curso).set({ publicado: true }).where(eq(curso.slug, "oposiciones-auxiliar-administrativo"));
    });

    it("si ya tiene el curso responde 409", async () => {
      const error = await errorDe(crearCheckout(lucia, { curso: "desarrollo-web" }, bd.db));
      expect(error.codigo).toBe("CONFLICTO");
      expect(error.message).toBe("Ya tienes este curso");
    });
  });

  describe("confirmarPago", () => {
    it("con cualquier tarjeta marca el pedido como pagado y matricula al comprador", async () => {
      const sesion = await crearCheckout(comprador, { curso: "python-desde-cero" }, bd.db);
      const pago = await confirmarPago(comprador, { sesion: sesion.id, metodo: "tarjeta", tarjeta: TARJETA }, bd.db);

      expect(pago).toMatchObject({
        object: "payment_intent",
        amount: 4900,
        currency: "eur",
        status: "succeeded",
        payment_method_types: ["tarjeta"],
        curso: { slug: "python-desde-cero" },
      });
      expect(pago.id).toMatch(/^pi_test_[A-Za-z0-9]{24}$/);

      const [p] = await bd.db.select().from(pedido).where(eq(pedido.stripeSessionId, sesion.id));
      expect(p).toMatchObject({ estado: "pagado", stripePaymentIntent: pago.id });
      expect(p.pagadoEn).toBeInstanceOf(Date);

      const [m] = await bd.db
        .select()
        .from(matricula)
        .where(and(eq(matricula.email, "compra@demo.test"), eq(matricula.pedidoId, p.id)));
      expect(m).toMatchObject({ usuarioId: comprador.id, origen: "compra", rolEnCurso: "alumno", cursoId: p.cursoId });
    });

    it("no guarda los datos de la tarjeta en ningún sitio", async () => {
      const sesion = await crearCheckout(comprador, { curso: "cocina-mediterranea-saludable" }, bd.db);
      await confirmarPago(
        comprador,
        { sesion: sesion.id, metodo: "tarjeta", tarjeta: { ...TARJETA, numero: "4999888877776666" } },
        bd.db,
      );
      const filas = JSON.stringify(await bd.db.select().from(pedido));
      expect(filas).not.toContain("4999888877776666");
    });

    it("también vale con PayPal, Bizum o la cartera del móvil, sin tarjeta", async () => {
      const sesion = await crearCheckout(otro, { curso: "python-desde-cero" }, bd.db);
      const pago = await confirmarPago(otro, { sesion: sesion.id, metodo: "bizum" }, bd.db);
      expect(pago.status).toBe("succeeded");
      expect(pago.payment_method_types).toEqual(["bizum"]);
    });

    it("un curso gratis se confirma sin método de pago", async () => {
      const sesion = await crearCheckout(otro, { curso: "costura-para-principiantes" }, bd.db);
      const pago = await confirmarPago(otro, { sesion: sesion.id, metodo: "gratis" }, bd.db);
      expect(pago).toMatchObject({ amount: 0, status: "succeeded" });
    });

    it("un curso de pago no se puede confirmar como «gratis»", async () => {
      const sesion = await crearCheckout(otro, { curso: "ia-generativa-dia-a-dia" }, bd.db);
      const error = await errorDe(confirmarPago(otro, { sesion: sesion.id, metodo: "gratis" }, bd.db));
      expect(error.codigo).toBe("DATOS_INVALIDOS");
      const [p] = await bd.db.select().from(pedido).where(eq(pedido.stripeSessionId, sesion.id));
      expect(p.estado).toBe("pendiente");
    });

    it("el pago de otro usuario responde 404 y no cambia nada", async () => {
      const sesion = await crearCheckout(otro, { curso: "cocina-mediterranea-saludable" }, bd.db);
      const error = await errorDe(confirmarPago(comprador, { sesion: sesion.id, metodo: "bizum" }, bd.db));
      expect(error.codigo).toBe("NO_ENCONTRADO");
      const [p] = await bd.db.select().from(pedido).where(eq(pedido.stripeSessionId, sesion.id));
      expect(p.estado).toBe("pendiente");
    });

    it("una sesión que no existe responde 404", async () => {
      const error = await errorDe(confirmarPago(comprador, { sesion: "cs_test_noexiste", metodo: "bizum" }, bd.db));
      expect(error.codigo).toBe("NO_ENCONTRADO");
    });
  });

  describe("confirmarPagoYMatricular (la función que reutilizará el webhook)", () => {
    it("es idempotente: confirmar dos veces no duplica la matrícula ni cambia la fecha de pago", async () => {
      const sesion = await crearCheckout(otro, { curso: "oposiciones-auxiliar-administrativo" }, bd.db);
      const datos = { stripeSessionId: sesion.id, paymentIntent: "pi_test_1", usuarioId: otro.id };
      const primera = await confirmarPagoYMatricular(datos, bd.db);
      const segunda = await confirmarPagoYMatricular({ ...datos, paymentIntent: "pi_test_2" }, bd.db);

      expect(segunda.pedido.pagadoEn).toEqual(primera.pedido.pagadoEn);
      expect(segunda.pedido.stripePaymentIntent).toBe("pi_test_1");
      const matriculas = await bd.db.select().from(matricula).where(eq(matricula.pedidoId, primera.pedido.id));
      expect(matriculas).toHaveLength(1);
    });
  });
});
