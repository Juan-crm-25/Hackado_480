/**
 * Datos del seed, sin tocar la BBDD (funciones puras): el catálogo de data/catalog.json convertido en filas
 * y los usuarios de prueba. `sembrar()` (./sembrar.ts) los inserta.
 */
import { createHash } from "node:crypto";
import type { Alumno, Catalogo } from "../../types";

type Rol = "alumno" | "profesor" | "admin";

export interface UsuarioSeed {
  nombre: string;
  email: string;
  rol: Rol;
  emailVerificado: boolean;
  esMenor: boolean;
  consentimientoTutorLegal: boolean;
  seudonimo: string;
}

export interface CatalogoSeed {
  categoria: { slug: string; nombre: string };
  curso: { slug: string; titulo: string; descripcion: string; precioCentimos: number; publicado: boolean };
  modulos: {
    slug: string;
    titulo: string;
    descripcion: string;
    ordenSugerido: number;
    conceptos: { slug: string; nombre: string }[];
    clases: { slug: string; titulo: string; videoUrl: string; duracionSegundos: number; orden: number }[];
  }[];
}

/** Los 8 alumnos inventados que completan los 2 de la demo (src/lib/datos-prueba.ts). */
const OTROS_ALUMNOS = [
  { nombre: "Carmen López", email: "carmen@demo.test" },
  { nombre: "Javier Sánchez", email: "javier@demo.test" },
  { nombre: "Marta Gómez", email: "marta@demo.test" },
  { nombre: "Diego Fernández", email: "diego@demo.test" },
  { nombre: "Laura Díaz", email: "laura@demo.test" },
  { nombre: "Sergio Moreno", email: "sergio@demo.test" },
  { nombre: "Elena Navarro", email: "elena@demo.test" },
  { nombre: "Hugo Romero", email: "hugo@demo.test" },
];

const PROFESOR = { nombre: "Ana Torres", email: "profesora@demo.test" };
const ADMIN = { nombre: "Administración Hackado", email: "admin@demo.test" };

/** Seudónimo estable: el mismo email da siempre el mismo seudónimo, sin revelar el email. */
export function seudonimoDe(email: string, rol: Rol): string {
  return `${rol}_${createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 10)}`;
}

function usuario(nombre: string, email: string, rol: Rol, menor = { esMenor: false, consentimientoTutorLegal: false }): UsuarioSeed {
  const emailNormalizado = email.toLowerCase();
  return {
    nombre,
    email: emailNormalizado,
    rol,
    emailVerificado: true,
    ...menor,
    seudonimo: seudonimoDe(emailNormalizado, rol),
  };
}

/** 10 alumnos (los primeros, los de la demo), 1 profesor y 1 admin. */
export function construirUsuarios(alumnosDemo: Alumno[]): UsuarioSeed[] {
  const demo = alumnosDemo.map((a) =>
    usuario(a.nombre, a.email, "alumno", { esMenor: a.esMenor, consentimientoTutorLegal: a.consentimientoTutorLegal }),
  );
  const otros = OTROS_ALUMNOS.slice(0, 10 - demo.length).map((a) => usuario(a.nombre, a.email, "alumno"));
  return [...demo, ...otros, usuario(PROFESOR.nombre, PROFESOR.email, "profesor"), usuario(ADMIN.nombre, ADMIN.email, "admin")];
}

/** El curso de catalog.json con sus módulos, conceptos y clases (un vídeo = una clase). Sin transcripciones. */
export function construirCatalogo(catalogo: Catalogo): CatalogoSeed {
  const { curso } = catalogo;
  return {
    categoria: { slug: "programacion", nombre: "Programación" },
    curso: { slug: curso.id, titulo: curso.titulo, descripcion: curso.descripcion, precioCentimos: 0, publicado: true },
    modulos: curso.modulos.map((m) => ({
      slug: m.id,
      titulo: m.titulo,
      descripcion: m.descripcion,
      ordenSugerido: m.ordenSugerido,
      conceptos: m.conceptos.map((c) => ({ slug: c.id, nombre: c.nombre })),
      clases: m.videos.map((v, i) => ({
        slug: v.id,
        titulo: v.titulo,
        videoUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
        duracionSegundos: v.duracionSegundos,
        orden: i + 1,
      })),
    })),
  };
}

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1"]);

/**
 * El seed solo escribe en la BBDD local, salvo que se pida a propósito (SEED_PERMITIR_REMOTO=1),
 * para no llenar de datos de prueba otra BBDD por tener una DATABASE_URL equivocada.
 */
export function comprobarDestino(url: string | undefined, permitirRemoto: boolean): { permitido: boolean; motivo?: string } {
  if (!url) return { permitido: false, motivo: "Falta DATABASE_URL." };
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return { permitido: false, motivo: "DATABASE_URL no es una URL válida." };
  }
  if (HOSTS_LOCALES.has(host) || permitirRemoto) return { permitido: true };
  return {
    permitido: false,
    motivo: `DATABASE_URL apunta a "${host}", que no es la BBDD local. Si de verdad quieres sembrar esa BBDD, repite con SEED_PERMITIR_REMOTO=1.`,
  };
}
