/** Ayudas de presentación para el formulario de tarjeta (solo formato: el pago es simulado). */

const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

/** «4242424242424242» → «4242 4242 4242 4242» (máximo 19 dígitos). */
export function formatearNumeroTarjeta(texto: string): string {
  return (
    soloDigitos(texto)
      .slice(0, 19)
      .match(/.{1,4}/g)
      ?.join(" ") ?? ""
  );
}

/** «1230» → «12/30» mientras se teclea. */
export function formatearCaducidad(texto: string): string {
  const digitos = soloDigitos(texto).slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

/** Marca de la tarjeta por sus primeros dígitos, o null si no se reconoce. */
export function marcaTarjeta(texto: string): "Visa" | "Mastercard" | "American Express" | null {
  const digitos = soloDigitos(texto);
  if (/^4/.test(digitos)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digitos)) return "Mastercard";
  if (/^3[47]/.test(digitos)) return "American Express";
  return null;
}
