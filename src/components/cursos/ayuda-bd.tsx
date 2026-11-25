/** Qué hacer si no hay catálogo: es lo que le pasa a quien acaba de clonar el repositorio. */
export function AyudaBd() {
  return (
    <>
      Arranca la base de datos con <code className="font-mono">npm run db:up</code> y carga los datos de ejemplo con{" "}
      <code className="font-mono">npm run db:seed</code>.
    </>
  );
}
