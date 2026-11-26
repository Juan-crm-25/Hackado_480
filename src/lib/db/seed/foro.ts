/**
 * Foro de la demo (H10, S13): dudas por módulo del curso de la demo, unas respondidas y valoradas y otras sin responder.
 * Datos puros: sembrar() resuelve los ids y las inserta. Lucía y Pablo no responden en ningún tema: quedan
 * libres para la demo en directo (Pablo responde a la duda de especificidad de Lucía).
 * Carmen y Javier tampoco aparecen: los tests del foro y de los puntos los usan con datos propios.
 */
import { FRASES_SENSEI, type ValidacionForo, type ValoracionRespuesta } from "../../foro";
import { EMAIL_IA_FORO } from "./datos";

/** Quien comenta, corrige y da los puntos del profesor en el foro de la demo. */
export const PROFESORA_FORO = "profesora@demo.test";
const PROFESORA = PROFESORA_FORO;

/** Fecha fija en el pasado: el orden de temas y comentarios es siempre el mismo. */
const BASE = Date.UTC(2026, 9, 5, 9, 0, 0); // 5 de octubre de 2026, 09:00 UTC
const enMinutos = (minutos: number) => new Date(BASE + minutos * 60_000);

export interface ComentarioForoSeed {
  clave: string; // para enlazar la respuesta de Sensei con el comentario al que contesta
  autor: string; // email
  cuerpo: string;
  creado: Date;
  respuestaA?: string; // clave del comentario al que responde
  validacion: ValidacionForo;
  validadoPor?: "ia" | "profesor";
  validadoEn?: Date;
  profesor?: string; // email, solo si valida el profesor
  puntosProfesor?: { puntos: 1 | 3 | 6; motivo: "buena_pregunta" | "buena_conducta" };
}

export interface TemaForoSeed {
  moduloSlug: string;
  autor: string; // email
  titulo: string;
  cuerpo: string;
  creado: Date;
  puntosProfesor?: { puntos: 1 | 3 | 6; motivo: "buena_pregunta" | "buena_conducta" };
  comentarios: ComentarioForoSeed[];
}

interface Comentario {
  autor: string;
  cuerpo: string;
  /** Valoración de la IA (Sensei contesta), «no_respuesta» de la IA, del profesor, o pendiente (comentario del profesor). */
  valoracion?: ValoracionRespuesta | "no_respuesta";
  delProfesor?: ValidacionForo;
  puntosProfesor?: ComentarioForoSeed["puntosProfesor"];
}

interface Tema extends Omit<TemaForoSeed, "creado" | "comentarios"> {
  comentarios: Comentario[];
}

const TEMAS: Tema[] = [
  {
    moduloSlug: "m1-html",
    autor: "marta@demo.test",
    titulo: "¿Cuándo uso <section> y cuándo <div>?",
    cuerpo: "En los ejemplos salen las dos y no veo la diferencia. ¿No hacen lo mismo?",
    puntosProfesor: { puntos: 3, motivo: "buena_pregunta" },
    comentarios: [
      {
        autor: "diego@demo.test",
        cuerpo: "<section> agrupa contenido con un tema propio y suele llevar un título; <div> es un contenedor sin significado, solo para maquetar o dar estilo.",
        valoracion: "correcta",
      },
      { autor: "hugo@demo.test", cuerpo: "Son lo mismo, solo cambia el nombre de la etiqueta.", valoracion: "incorrecta" },
      { autor: "laura@demo.test", cuerpo: "¡Gracias! Yo tenía la misma duda.", valoracion: "no_respuesta" },
      {
        autor: PROFESORA,
        cuerpo: "Buen resumen, Diego. Un truco: si ese bloque tendría sentido como apartado del índice de la página, usa <section>.",
      },
    ],
  },
  {
    moduloSlug: "m2-css",
    autor: "elena@demo.test",
    titulo: "¿Qué diferencia hay entre margin y padding?",
    cuerpo: "Los dos separan cosas, pero no sé cuál poner para separar el texto del borde de la caja.",
    comentarios: [
      { autor: "sergio@demo.test", cuerpo: "padding es el espacio de dentro, entre el contenido y el borde; margin es el de fuera, entre la caja y las demás.", valoracion: "correcta" },
      { autor: "hugo@demo.test", cuerpo: "Para separar el texto del borde, padding. margin separa la caja de lo que tiene alrededor.", valoracion: "correcta" },
      { autor: "diego@demo.test", cuerpo: "En el modelo de caja: contenido, padding, borde y margin, en ese orden de dentro afuera. Tú necesitas padding.", valoracion: "correcta" },
      { autor: "laura@demo.test", cuerpo: "padding va dentro del borde y además se pinta con el fondo de la caja; margin queda fuera y es transparente.", valoracion: "correcta" },
      { autor: "sergio@demo.test", cuerpo: "Lo repito por si acaso: padding dentro del borde, margin fuera.", valoracion: "correcta" },
    ],
  },
  {
    moduloSlug: "m3-responsive",
    autor: "hugo@demo.test",
    titulo: "Mi menú con flex no se pone en columna en el móvil",
    cuerpo: "Tengo .menu { display: flex; } y en el móvil los enlaces siguen en fila y se salen de la pantalla.",
    comentarios: [
      { autor: "marta@demo.test", cuerpo: "Tienes que usar una media query para el móvil.", valoracion: "aproximada" },
      {
        autor: "elena@demo.test",
        cuerpo: "Añade @media (max-width: 600px) { .menu { flex-direction: column; } } y comprueba que tienes la etiqueta meta viewport en el <head>.",
        valoracion: "correcta",
      },
      { autor: "sergio@demo.test", cuerpo: "Prueba con flex-wrap: wrap en .menu: los enlaces que no caben bajan a otra fila.", delProfesor: "aproximada" },
    ],
  },
  {
    moduloSlug: "m4-javascript",
    autor: "laura@demo.test",
    titulo: "addEventListener me da error: el botón es null",
    cuerpo: "Hago document.querySelector('#enviar').addEventListener('click', ...) y la consola dice que no puede leer propiedades de null.",
    comentarios: [
      {
        autor: "sergio@demo.test",
        cuerpo: "El script se ejecuta antes de que exista el botón. Pon el <script> al final del <body> o añádele el atributo defer.",
        valoracion: "correcta",
      },
      { autor: "elena@demo.test", cuerpo: "Cambia const por var y ya está.", valoracion: "incorrecta" },
      {
        autor: "marta@demo.test",
        cuerpo: "¡Gracias por preguntarlo! Me pasaba lo mismo.",
        valoracion: "no_respuesta",
        puntosProfesor: { puntos: 1, motivo: "buena_conducta" },
      },
    ],
  },
  // Sin responder: para la demo en directo.
  {
    moduloSlug: "m2-css",
    autor: "lucia@demo.test",
    titulo: "Si un elemento tiene una clase y un id, ¿qué color gana?",
    cuerpo: "Tengo .aviso { color: green; } y #mensaje { color: red; } en el mismo párrafo y sale rojo aunque la clase está después. ¿Por qué?",
    comentarios: [],
  },
  {
    moduloSlug: "m4-javascript",
    autor: "diego@demo.test",
    titulo: "¿Cuándo uso let y cuándo const?",
    cuerpo: "En los ejercicios casi todo es const, pero para un contador uso let. ¿Hay una regla?",
    comentarios: [],
  },
];

/**
 * Temas con sus comentarios en orden y con fechas fijas: cada tema empieza un día después del anterior,
 * cada comentario 30 minutos después del anterior, y Sensei contesta un minuto después de la respuesta que valoró la IA.
 */
export function construirForoDemo(): TemaForoSeed[] {
  return TEMAS.map((tema, t) => {
    const inicio = t * 24 * 60;
    const comentarios: ComentarioForoSeed[] = [];
    tema.comentarios.forEach((c, i) => {
      const creado = enMinutos(inicio + 30 * (i + 1));
      const valorado = enMinutos(inicio + 30 * (i + 1) + 1);
      const clave = `${t}.${i}`;
      const base = { clave, autor: c.autor, cuerpo: c.cuerpo, creado, puntosProfesor: c.puntosProfesor };
      if (c.delProfesor) {
        comentarios.push({ ...base, validacion: c.delProfesor, validadoPor: "profesor", validadoEn: valorado, profesor: PROFESORA });
      } else if (c.valoracion) {
        comentarios.push({ ...base, validacion: c.valoracion, validadoPor: "ia", validadoEn: valorado });
        if (c.valoracion !== "no_respuesta") {
          // Como hace el servicio: Sensei contesta en el hilo con la frase de la valoración, y su comentario queda pendiente.
          comentarios.push({ clave: `${clave}.sensei`, autor: EMAIL_IA_FORO, cuerpo: FRASES_SENSEI[c.valoracion], creado: valorado, respuestaA: clave, validacion: "pendiente" });
        }
      } else {
        comentarios.push({ ...base, validacion: "pendiente" });
      }
    });
    return {
      moduloSlug: tema.moduloSlug,
      autor: tema.autor,
      titulo: tema.titulo,
      cuerpo: tema.cuerpo,
      creado: enMinutos(inicio),
      puntosProfesor: tema.puntosProfesor,
      comentarios,
    };
  });
}
