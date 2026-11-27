/**
 * DATOS DE DEMOSTRACIÓN del MVP: premios que se canjean con los puntos del foro en el perfil.
 * El canje es una SIMULACIÓN (src/components/premios): no hay tabla de premios ni se entrega nada.
 * Ver AGENTS.md, «Data rules»: src/lib/demo/ es contenido de ejemplo fijo.
 */
export interface Premio {
  id: string;
  nombre: string;
  descripcion: string;
  /** Puntos que hay que tener para canjearlo. */
  puntos: number;
  /** Ruta de la imagen en public/. */
  imagen: string;
  /** El premio final: va aparte, con su propia barra. */
  legendario?: boolean;
}

export const PREMIOS: Premio[] = [
  {
    id: "preguntas-tutor",
    nombre: "10 preguntas extra para el tutor (IA)",
    descripcion: "Diez preguntas más al tutor de cualquier módulo, además de las del día.",
    puntos: 100,
    imagen: "/premios/preguntas.webp",
  },
  {
    id: "pato-480",
    nombre: "Pato de 480",
    descripcion: "Objeto único: el pato oficial de 480.",
    puntos: 340,
    imagen: "/premios/pato480.webp",
  },
  {
    id: "entradas-mwc",
    nombre: "2 entradas para el MWC 2027",
    descripcion: "Dos entradas para el Mobile World Congress de Barcelona 2027.",
    puntos: 460,
    imagen: "/premios/entrada-mwc.webp",
  },
  {
    id: "viaje-esa",
    nombre: "Misión Leyenda",
    descripcion: "Un viaje para ver despegar un cohete de la ESA, con un tour por sus instalaciones.",
    puntos: 9999,
    imagen: "/premios/Cohete-ESA.webp",
    legendario: true,
  },
];
