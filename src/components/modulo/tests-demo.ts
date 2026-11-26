/**
 * Test de demostración · el test definitivo llega con la issue #3 («H3 · Ejercicios de verificación con corrección»).
 * Una pregunta de 3 opciones por vídeo del curso de demostración (ids v01…v12); otros ids reciben una genérica.
 * Es contenido fijo del MVP, no datos: cuando exista el banco de ejercicios, esto desaparece.
 */

export type PreguntaDemo = {
  enunciado: string;
  opciones: readonly [string, string, string];
  /** Índice de la opción correcta. */
  correcta: 0 | 1 | 2;
};

export const TESTS_DEMO: Record<string, PreguntaDemo> = {
  v01: {
    enunciado: "¿Qué hace el navegador con el HTML que recibe del servidor?",
    opciones: ["Lo compila a un programa", "Lo interpreta y pinta la página", "Lo envía a otro servidor"],
    correcta: 1,
  },
  v02: {
    enunciado: "¿En qué parte del documento HTML va el contenido que ve el usuario?",
    opciones: ["En <head>", "En <body>", "En <meta>"],
    correcta: 1,
  },
  v03: {
    enunciado: "¿Qué etiqueta es la más adecuada para el menú de navegación principal?",
    opciones: ["<nav>", "<div>", "<span>"],
    correcta: 0,
  },
  v04: {
    enunciado: "¿Qué selector tiene más especificidad?",
    opciones: [".boton", "button", "#enviar"],
    correcta: 2,
  },
  v05: {
    enunciado: "Con box-sizing: border-box, ¿qué incluye el width de un elemento?",
    opciones: ["Solo el contenido", "Contenido, padding y borde", "Contenido, padding, borde y margen"],
    correcta: 1,
  },
  v06: {
    enunciado: "¿Respecto a qué se calcula la unidad rem?",
    opciones: ["El tamaño de letra del elemento padre", "El ancho de la ventana", "El tamaño de letra del elemento raíz (html)"],
    correcta: 2,
  },
  v07: {
    enunciado: "En un contenedor flex en fila, ¿qué propiedad alinea los elementos en el eje horizontal?",
    opciones: ["justify-content", "align-items", "flex-wrap"],
    correcta: 0,
  },
  v08: {
    enunciado: "¿Qué crea grid-template-columns: 1fr 1fr 1fr?",
    opciones: ["Tres filas iguales", "Tres columnas iguales", "Una columna de tres píxeles"],
    correcta: 1,
  },
  v09: {
    enunciado: "¿Qué hace @media (min-width: 768px) { … }?",
    opciones: [
      "Aplica los estilos solo en pantallas de 768 px o más",
      "Aplica los estilos solo en pantallas de menos de 768 px",
      "Fija el ancho de la página a 768 px",
    ],
    correcta: 0,
  },
  v10: {
    enunciado: "¿Qué palabra declara en JavaScript una variable que no se va a reasignar?",
    opciones: ["var", "let", "const"],
    correcta: 2,
  },
  v11: {
    enunciado: "¿Qué método devuelve el primer elemento que coincide con un selector CSS?",
    opciones: ["document.querySelector()", "document.write()", "document.getElementsByTagName()"],
    correcta: 0,
  },
  v12: {
    enunciado: "¿Cómo se ejecuta una función cuando el usuario hace clic en un botón?",
    opciones: ["boton.click = funcion()", "boton.addEventListener(\"click\", funcion)", "boton.onload(funcion)"],
    correcta: 1,
  },
};

/** Para vídeos sin pregunta propia. */
export const PREGUNTA_GENERICA: PreguntaDemo = {
  enunciado: "¿Qué conviene hacer si una parte del vídeo no te ha quedado clara?",
  opciones: ["Saltármela y seguir", "Volver a verla o preguntar al tutor", "Abandonar el módulo"],
  correcta: 1,
};

export function preguntaDeClase(claseId: string): PreguntaDemo {
  return TESTS_DEMO[claseId] ?? PREGUNTA_GENERICA;
}
