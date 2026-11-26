/**
 * DATOS DE DEMOSTRACIÓN del MVP: bandeja de mensajes SIMULADA, escrita a mano (no sale de la BBDD).
 * No hay backend de mensajería: lo que se envía solo vive en el estado del navegador.
 * Ver AGENTS.md, «Data rules»: src/lib/demo/ es contenido de ejemplo fijo.
 */
export interface Mensaje {
  id: string;
  /** «yo» es el usuario de la sesión; «otro», la otra persona de la conversación. */
  autor: "yo" | "otro";
  texto: string;
  /** Fecha y hora ISO 8601. */
  hora: string;
  /** Solo en los míos: la simulación los da por enviados al instante. */
  estado?: "enviado";
}

export interface Conversacion {
  id: string;
  nombre: string;
  /** Quién es (profesora, equipo…), bajo el nombre. */
  rol: string;
  noLeidos: number;
  mensajes: Mensaje[];
}

export const conversacionesDemo: Conversacion[] = [
  {
    id: "ana-torres",
    nombre: "Ana Torres",
    rol: "Profesora de Desarrollo web",
    noLeidos: 1,
    mensajes: [
      {
        id: "ana-1",
        autor: "otro",
        texto: "¡Hola! Soy Ana, tu profesora. Si te atascas con algún módulo, escríbeme por aquí.",
        hora: "2026-11-20T09:15:00.000Z",
      },
      {
        id: "ana-2",
        autor: "yo",
        texto: "¡Gracias, Ana! Me está costando un poco la especificidad de CSS.",
        hora: "2026-11-20T18:02:00.000Z",
        estado: "enviado",
      },
      {
        id: "ana-3",
        autor: "otro",
        texto: "Es normal al principio. Repasa el vídeo de selectores y prueba el material de repaso; el jueves lo vemos en la tutoría.",
        hora: "2026-11-21T08:40:00.000Z",
      },
    ],
  },
  {
    id: "equipo-480",
    nombre: "Equipo 480 Academy",
    rol: "Soporte",
    noLeidos: 1,
    mensajes: [
      {
        id: "equipo-1",
        autor: "otro",
        texto: "¡Bienvenida a 480 Academy! Aquí te avisaremos de novedades del curso. Si necesitas ayuda, responde a este mensaje.",
        hora: "2026-11-18T10:00:00.000Z",
      },
    ],
  },
  {
    id: "lucia-martin",
    nombre: "Lucía Martín",
    rol: "Compañera del curso",
    noLeidos: 0,
    mensajes: [
      {
        id: "lucia-1",
        autor: "otro",
        texto: "¿Te apuntas a repasar juntas el módulo de JavaScript este finde?",
        hora: "2026-11-22T16:30:00.000Z",
      },
      {
        id: "lucia-2",
        autor: "yo",
        texto: "¡Claro! El sábado por la mañana me viene bien.",
        hora: "2026-11-22T17:05:00.000Z",
        estado: "enviado",
      },
    ],
  },
];

/** Total de mensajes sin leer, para el contador del icono. */
export function totalNoLeidos(conversaciones: Conversacion[]): number {
  return conversaciones.reduce((total, c) => total + c.noLeidos, 0);
}
