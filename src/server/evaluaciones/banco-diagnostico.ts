import "server-only";

export type PreguntaDiagnosticoInterna = {
  id: string;
  orden: number;
  enunciado: string;
  opciones: string[];
  correcta: number;
};

export type PreguntaDiagnosticoPublica = Omit<PreguntaDiagnosticoInterna, "correcta">;

const BANCO_POR_MODULO: Record<string, PreguntaDiagnosticoInterna[]> = {
  "m1-html": [
    {
      id: "diag-html-1",
      orden: 1,
      enunciado: "¿Qué etiqueta HTML define el contenido principal y único de un documento?",
      opciones: ["<section>", "<main>", "<article>", "<header>"],
      correcta: 1,
    },
    {
      id: "diag-html-2",
      orden: 2,
      enunciado: "¿Dónde se colocan los metadatos, el título de la pestaña y los enlaces a hojas de estilo?",
      opciones: ["Dentro de <body>", "Dentro de <head>", "Antes de <!DOCTYPE html>", "Dentro de <footer>"],
      correcta: 1,
    },
    {
      id: "diag-html-3",
      orden: 3,
      enunciado: "¿Qué etiqueta semántica es más adecuada para un bloque de enlaces de navegación principales?",
      opciones: ["<div class='menu'>", "<aside>", "<nav>", "<span>"],
      correcta: 2,
    },
  ],
  "m2-css": [
    {
      id: "diag-css-1",
      orden: 1,
      enunciado: "¿Qué selector tiene mayor especificidad en CSS?",
      opciones: ["p", ".tarjeta", "#cabecera", "div p"],
      correcta: 2,
    },
    {
      id: "diag-css-2",
      orden: 2,
      enunciado: "En el modelo de caja (box model), ¿qué propiedad controla el espacio interior entre el contenido y el borde?",
      opciones: ["margin", "padding", "gap", "outline"],
      correcta: 1,
    },
    {
      id: "diag-css-3",
      orden: 3,
      enunciado: "¿Respecto a qué elemento calcula su tamaño la unidad relativa rem?",
      opciones: ["Al elemento padre directo", "Al ancho de la ventana (viewport)", "Al elemento raíz (<html>)", "Al tamaño de línea actual"],
      correcta: 2,
    },
  ],
  "m3-responsive": [
    {
      id: "diag-resp-1",
      orden: 1,
      enunciado: "En Flexbox, ¿qué propiedad alinea los elementos a lo largo del eje principal?",
      opciones: ["align-items", "justify-content", "flex-wrap", "align-content"],
      correcta: 1,
    },
    {
      id: "diag-resp-2",
      orden: 2,
      enunciado: "¿Qué unidad de CSS Grid reparte el espacio disponible en fracciones proporcionales?",
      opciones: ["rem", "vw", "fr", "%"],
      correcta: 2,
    },
    {
      id: "diag-resp-3",
      orden: 3,
      enunciado: "En un enfoque mobile-first, ¿qué media query aplica estilos a partir de pantallas de 768 px?",
      opciones: ["@media (max-width: 768px)", "@media (min-width: 768px)", "@media (width: 768px)", "@media screen and (height: 768px)"],
      correcta: 1,
    },
  ],
  "m4-javascript": [
    {
      id: "diag-js-1",
      orden: 1,
      enunciado: "¿Qué palabra clave declara una variable con ámbito de bloque cuyo valor no se puede reasignar?",
      opciones: ["var", "let", "const", "static"],
      correcta: 2,
    },
    {
      id: "diag-js-2",
      orden: 2,
      enunciado: "¿Qué método selecciona el primer elemento del DOM que coincide con un selector CSS?",
      opciones: ["document.getElementById()", "document.querySelector()", "document.querySelectorAll()", "document.createElement()"],
      correcta: 1,
    },
    {
      id: "diag-js-3",
      orden: 3,
      enunciado: "¿Qué método se utiliza para escuchar un clic sobre un botón sin sobrescribir otros manejadores?",
      opciones: ["boton.onClick()", "boton.addEventListener('click', fn)", "boton.listen('click', fn)", "boton.trigger('click')"],
      correcta: 1,
    },
  ],
};

export function preguntasDiagnosticoPorDefecto(moduloSlug: string): PreguntaDiagnosticoInterna[] {
  return BANCO_POR_MODULO[moduloSlug] ?? [];
}