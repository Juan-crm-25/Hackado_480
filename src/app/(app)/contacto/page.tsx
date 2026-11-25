import { Mail } from "lucide-react";

// TODO(contacto): sustituir por la dirección de soporte real cuando la tengamos. Esta es ficticia.
const EMAIL_CONTACTO = "contacto@demo.test";

/** Contáctanos: cómo escribir al equipo. */
export default function Contacto() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl lg:max-w-5xl lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl leading-tight font-bold">Contáctanos</h1>
        <p className="max-w-prose text-base text-muted-foreground">
          ¿Tienes una duda sobre el curso, un problema con la app o una idea? Escríbenos y te respondemos lo antes
          posible.
        </p>
      </header>

      <a
        href={`mailto:${EMAIL_CONTACTO}`}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <Mail className="size-5" aria-hidden />
        {EMAIL_CONTACTO}
      </a>
    </main>
  );
}
