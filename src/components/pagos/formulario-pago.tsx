"use client";

import { CreditCard, FlaskConical, Lock, Nfc, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatoPrecio } from "@/lib/formato";
import { METODOS_PAGO, type DatosTarjeta, type MetodoPago } from "@/lib/pagos";
import { formatearCaducidad, formatearNumeroTarjeta, marcaTarjeta } from "@/lib/tarjeta";

type MetodoElegible = (typeof METODOS_PAGO)[number]["id"];

export type DatosPago = { metodo: "tarjeta"; tarjeta: DatosTarjeta } | { metodo: Exclude<MetodoPago, "tarjeta"> };

const ICONOS: Record<MetodoElegible, LucideIcon> = { tarjeta: CreditCard, paypal: Wallet, bizum: Smartphone, cartera: Nfc };

/** Qué pasaría con cada método en una app real; en la demo todos se confirman al momento. */
const EXPLICACION: Record<Exclude<MetodoElegible, "tarjeta">, string> = {
  paypal: "Te llevaríamos a PayPal para que confirmes el pago con tu cuenta.",
  bizum: "Recibirías una notificación en la app de tu banco para aceptar el Bizum.",
  cartera: "Confirmarías el pago con Face ID, la huella o el PIN de tu móvil.",
};

/**
 * Formulario del pago SIMULADO (issue #42): cualquier tarjeta vale y los otros métodos se confirman al momento.
 * Un curso gratis no pide método de pago. Los datos de la tarjeta solo viajan en la petición: nunca se guardan.
 */
export function FormularioPago({
  precioCentimos,
  procesando,
  onPagar,
}: {
  precioCentimos: number;
  procesando: boolean;
  onPagar: (datos: DatosPago) => void;
}) {
  const [metodo, setMetodo] = useState<MetodoElegible>("tarjeta");
  const [tarjeta, setTarjeta] = useState<DatosTarjeta>({ numero: "", caducidad: "", cvc: "", titular: "" });
  const gratis = precioCentimos === 0;
  const marca = marcaTarjeta(tarjeta.numero);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (gratis) onPagar({ metodo: "gratis" });
    else if (metodo === "tarjeta") onPagar({ metodo, tarjeta });
    else onPagar({ metodo });
  }

  const textoBoton = procesando
    ? "Procesando el pago…"
    : gratis
      ? "Apuntarme gratis"
      : `Pagar ${formatoPrecio(precioCentimos)}`;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      {!gratis && (
        <fieldset className="flex flex-col gap-3" disabled={procesando}>
          <legend className="pb-3 text-lg font-bold">Método de pago</legend>
          <ToggleGroup
            value={[metodo]}
            // Al pulsar el método ya elegido, Base UI lo desmarca (valor vacío): se ignora para que siempre haya uno.
            onValueChange={(v) => v[0] && setMetodo(v[0] as MetodoElegible)}
            spacing={2}
            className="grid w-full grid-cols-2 md:grid-cols-4"
          >
            {METODOS_PAGO.map(({ id, nombre }) => {
              const Icono = ICONOS[id];
              return (
                <ToggleGroupItem
                  key={id}
                  value={id}
                  className="h-auto min-h-16 flex-col gap-1.5 border border-border px-2 py-3 text-center text-sm whitespace-normal text-muted-foreground aria-pressed:border-primary aria-pressed:bg-muted aria-pressed:text-foreground"
                >
                  <Icono className="size-5" aria-hidden />
                  {nombre}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          {metodo === "tarjeta" ? (
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pago-numero">Número de la tarjeta</Label>
                <div className="relative">
                  <Input
                    id="pago-numero"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    value={tarjeta.numero}
                    onChange={(e) => setTarjeta({ ...tarjeta, numero: formatearNumeroTarjeta(e.target.value) })}
                    className="pr-28 tabular-nums"
                    aria-describedby={marca ? "pago-marca" : undefined}
                    required
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                    {marca && <span id="pago-marca">{marca}</span>}
                    <CreditCard className="size-4" aria-hidden />
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pago-caducidad">Caducidad</Label>
                  <Input
                    id="pago-caducidad"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    value={tarjeta.caducidad}
                    onChange={(e) => setTarjeta({ ...tarjeta, caducidad: formatearCaducidad(e.target.value) })}
                    className="tabular-nums"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pago-cvc">CVC</Label>
                  <Input
                    id="pago-cvc"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    maxLength={4}
                    value={tarjeta.cvc}
                    onChange={(e) => setTarjeta({ ...tarjeta, cvc: e.target.value.replace(/\D/g, "") })}
                    className="tabular-nums"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pago-titular">Titular de la tarjeta</Label>
                <Input
                  id="pago-titular"
                  autoComplete="cc-name"
                  placeholder="Como aparece en la tarjeta"
                  value={tarjeta.titular}
                  onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{EXPLICACION[metodo]}</p>
          )}
        </fieldset>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="accent" size="lg" disabled={procesando} className="w-full">
          {!procesando && !gratis && <Lock aria-hidden />}
          {textoBoton}
        </Button>
        <p className="flex flex-wrap items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <FlaskConical aria-hidden />
            Modo de prueba
          </Badge>
          No se cobra nada: cualquier tarjeta sirve.
        </p>
      </div>
    </form>
  );
}
