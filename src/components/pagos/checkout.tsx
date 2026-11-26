"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EstadoCargando, EstadoError } from "@/components/estado";
import { buttonVariants } from "@/components/ui/button";
import type { IntentoPago, PeticionConfirmar, SesionCheckout } from "@/lib/pagos";
import { leerRespuesta, mensajeDeError } from "@/lib/peticiones";
import { FormularioPago, type DatosPago } from "./formulario-pago";
import { PagoCompletado } from "./pago-completado";
import { enlaceCursoDelAlumno } from "@/lib/enlaces";
import { ResumenPedido, type CursoDelPedido } from "./resumen-pedido";

/** Lo que tarda el «banco» simulado en responder: da tiempo a ver el estado «Procesando el pago…». */
const ESPERA_SIMULADA_MS = 1200;

type Estado =
  | { fase: "preparando" }
  | { fase: "listo"; sesion: SesionCheckout; procesando: boolean; error: string | null }
  | { fase: "ya-lo-tienes" }
  | { fase: "error"; mensaje: string }
  | { fase: "completado"; pago: IntentoPago };

async function enviarJson<T>(url: string, cuerpo: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  if (res.status === 409) throw new YaLoTienes();
  return leerRespuesta<T>(res);
}

class YaLoTienes extends Error {}

/**
 * Pago simulado: al entrar crea la sesión de pago (POST /api/pagos/checkout, con el precio de la BBDD);
 * al pagar la confirma (POST /api/pagos/confirmar) y muestra el recibo, que pasa a ser el título de la pantalla.
 */
export function Checkout({ curso, precioCentimos }: { curso: CursoDelPedido; precioCentimos: number }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ fase: "preparando" });

  useEffect(() => {
    let cancelado = false;
    enviarJson<SesionCheckout>("/api/pagos/checkout", { curso: curso.slug })
      .then((sesion) => !cancelado && setEstado({ fase: "listo", sesion, procesando: false, error: null }))
      .catch((e) => {
        if (cancelado) return;
        setEstado(e instanceof YaLoTienes ? { fase: "ya-lo-tienes" } : { fase: "error", mensaje: mensajeDeError(e) });
      });
    return () => {
      cancelado = true;
    };
  }, [curso.slug]);

  async function pagar(sesion: SesionCheckout, datos: DatosPago) {
    setEstado({ fase: "listo", sesion, procesando: true, error: null });
    try {
      const peticion = { sesion: sesion.id, ...datos } as PeticionConfirmar;
      const [pago] = await Promise.all([
        enviarJson<IntentoPago>("/api/pagos/confirmar", peticion),
        new Promise((r) => setTimeout(r, ESPERA_SIMULADA_MS)),
      ]);
      setEstado({ fase: "completado", pago });
      router.refresh(); // «Tus cursos» y la ficha del curso ya lo muestran comprado
    } catch (e) {
      if (e instanceof YaLoTienes) setEstado({ fase: "ya-lo-tienes" });
      else setEstado({ fase: "listo", sesion, procesando: false, error: mensajeDeError(e) });
    }
  }

  if (estado.fase === "completado") return <PagoCompletado pago={estado.pago} />;

  return (
    <>
      <h1 className="text-3xl leading-tight font-bold md:text-4xl">Finalizar compra</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-10">
        <div className="lg:order-2 lg:sticky lg:top-6">
          <ResumenPedido curso={curso} precioCentimos={precioCentimos} />
        </div>
        <div className="flex flex-col gap-4 lg:order-1">
          {estado.fase === "preparando" && <EstadoCargando texto="Preparando tu pago…" />}
          {estado.fase === "error" && <EstadoError>{estado.mensaje}</EstadoError>}
          {estado.fase === "ya-lo-tienes" && (
            <div className="flex flex-col items-start gap-3 rounded-lg bg-muted p-4 text-sm">
              <p>Ya tienes este curso: no hace falta que lo vuelvas a comprar.</p>
              <Link href={enlaceCursoDelAlumno(curso.slug)} className={buttonVariants({ variant: "accent" })}>
                Ir a tu curso
              </Link>
            </div>
          )}
          {estado.fase === "listo" && (
            <>
              {estado.error && <EstadoError>{estado.error}</EstadoError>}
              <FormularioPago
                precioCentimos={estado.sesion.amount_total}
                procesando={estado.procesando}
                onPagar={(datos) => pagar(estado.sesion, datos)}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
