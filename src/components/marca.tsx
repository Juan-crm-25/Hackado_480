/**
 * Logotipo de texto «480_Academy». El guion bajo es una barra gruesa que va cambiando entre los
 * colores de la marca (cian → coral → verde), como en la web de Cuatroochenta.
 * - Es decorativo: los lectores de pantalla leen «480 Academy».
 * - Con «reducir movimiento» no se anima y se queda en coral, el único de los tres que llega a 3:1 sobre blanco.
 */
export function Marca() {
  return (
    <span className="inline-flex items-baseline">
      480
      <span
        aria-hidden="true"
        data-guion
        className="mx-0.5 inline-block h-[0.16em] w-[0.55em] self-end mb-[0.18em] bg-brand-coral motion-safe:animate-marca"
      />
      <span className="sr-only"> </span>
      Academy
    </span>
  );
}
