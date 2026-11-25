/**
 * Datos del seed, sin tocar la BBDD (funciones puras): el catálogo de data/catalog.json convertido en filas
 * y los usuarios de prueba. `sembrar()` (./sembrar.ts) los inserta.
 */
import { createHash } from "node:crypto";
import type { Alumno, Catalogo, EjercicioBase, PlantillaEjercicios, TipoEjercicio } from "../../types";

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

/**
 * Contraseña de TODOS los usuarios del seed (login simulado de la demo, SPEC.md). Solo datos de prueba:
 * el seed se niega a escribir en una BBDD remota sin SEED_PERMITIR_REMOTO=1.
 */
export const CONTRASENA_DEMO = "demo1234";

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

/** Un curso más del catálogo de demo: sin clases (clase.video_url es obligatorio y no se inventan vídeos). */
function cursoExtra(
  categoria: CatalogoSeed["categoria"],
  curso: Omit<CatalogoSeed["curso"], "publicado">,
  modulos: { slug: string; titulo: string; descripcion: string }[],
): CatalogoSeed {
  return {
    categoria,
    curso: { ...curso, publicado: true },
    modulos: modulos.map((m, i) => ({ ...m, ordenSugerido: i + 1, conceptos: [], clases: [] })),
  };
}

const PROGRAMACION = { slug: "programacion", nombre: "Programación" };

/** 5 cursos más, en otras categorías, para que la búsqueda y los filtros de la home tengan sentido. */
export const CURSOS_EXTRA: CatalogoSeed[] = [
  cursoExtra(
    PROGRAMACION,
    {
      slug: "python-desde-cero",
      titulo: "Python desde cero",
      descripcion: "Aprende a programar con Python paso a paso: variables, decisiones, bucles y tus primeros programas útiles.",
      precioCentimos: 4900,
    },
    [
      { slug: "p1-primeros-pasos", titulo: "Primeros pasos", descripcion: "Instala Python, usa la consola y escribe tu primer programa." },
      { slug: "p2-control", titulo: "Decisiones y bucles", descripcion: "if, for y while para que tus programas tomen decisiones y repitan tareas." },
      { slug: "p3-funciones", titulo: "Funciones y listas", descripcion: "Organiza el código en funciones y trabaja con colecciones de datos." },
    ],
  ),
  cursoExtra(
    { slug: "ia", nombre: "IA" },
    {
      slug: "ia-generativa-dia-a-dia",
      titulo: "IA generativa para el día a día",
      descripcion: "Usa asistentes de inteligencia artificial para escribir, resumir y organizarte, con criterio y cuidando tu privacidad.",
      precioCentimos: 2900,
    },
    [
      { slug: "i1-que-es", titulo: "Qué es la IA generativa", descripcion: "Cómo funcionan los asistentes, qué hacen bien y en qué se equivocan." },
      { slug: "i2-instrucciones", titulo: "Escribir buenas instrucciones", descripcion: "Técnicas sencillas para pedir lo que necesitas y obtener mejores respuestas." },
      { slug: "i3-uso-responsable", titulo: "Uso responsable", descripcion: "Privacidad, sesgos y cómo comprobar lo que te dice la IA." },
    ],
  ),
  cursoExtra(
    { slug: "cocina", nombre: "Cocina" },
    {
      slug: "cocina-mediterranea-saludable",
      titulo: "Cocina mediterránea saludable",
      descripcion: "Recetas sencillas de la dieta mediterránea y cómo planificar un menú semanal equilibrado.",
      precioCentimos: 1990,
    },
    [
      { slug: "c1-despensa", titulo: "La despensa mediterránea", descripcion: "Aceite, legumbres, verduras y cereales: qué comprar y cómo conservarlo." },
      { slug: "c2-menu-semanal", titulo: "Menú semanal", descripcion: "Planifica la semana y cocina por adelantado sin perder sabor." },
    ],
  ),
  cursoExtra(
    { slug: "costura", nombre: "Costura" },
    {
      slug: "costura-para-principiantes",
      titulo: "Costura para principiantes",
      descripcion: "Aprende a coser a mano y a máquina: arreglos básicos y tus primeras prendas sencillas.",
      precioCentimos: 0,
    },
    [
      { slug: "s1-a-mano", titulo: "Costura a mano", descripcion: "Puntadas básicas, botones y bajos." },
      { slug: "s2-maquina", titulo: "La máquina de coser", descripcion: "Enhebrar, ajustar la tensión y coser en recto y en curva." },
      { slug: "s3-primera-prenda", titulo: "Tu primera prenda", descripcion: "Patrón, corte y confección de una bolsa de tela." },
    ],
  ),
  cursoExtra(
    { slug: "oposiciones", nombre: "Oposiciones" },
    {
      slug: "oposiciones-auxiliar-administrativo",
      titulo: "Oposiciones: Auxiliar administrativo del Estado",
      descripcion: "Prepara el temario de Auxiliar administrativo del Estado con esquemas, repasos y una planificación de estudio.",
      precioCentimos: 8900,
    },
    [
      { slug: "o1-constitucion", titulo: "Constitución española", descripcion: "Estructura, derechos fundamentales y órganos constitucionales." },
      { slug: "o2-administracion", titulo: "Organización de la Administración", descripcion: "Administración General del Estado, autonómica y local." },
      { slug: "o3-ofimatica", titulo: "Ofimática", descripcion: "Procesador de textos, hoja de cálculo y correo electrónico para el examen práctico." },
    ],
  ),
];

/** Todos los cursos del seed: el de catalog.json (el de la demo) primero y luego CURSOS_EXTRA. */
export function construirCatalogos(catalogo: Catalogo): CatalogoSeed[] {
  return [construirCatalogo(catalogo), ...CURSOS_EXTRA];
}

/**
 * Alumnos de la demo matriculados en cada curso extra (por su posición entre los 10 alumnos),
 * con un número distinto en cada curso para que el recuento de estudiantes cambie de uno a otro.
 */
const ALUMNOS_EXTRA: Record<string, number[]> = {
  "python-desde-cero": [0, 1, 2, 3, 4, 5, 6],
  "ia-generativa-dia-a-dia": [0, 3, 7, 8, 9],
  "cocina-mediterranea-saludable": [1, 2, 4, 6, 8, 9],
  "costura-para-principiantes": [4, 7],
  "oposiciones-auxiliar-administrativo": [2, 5, 9],
};

export interface MatriculaSeed {
  cursoSlug: string;
  email: string;
  rolEnCurso: "alumno" | "profesor";
}

/**
 * Matrículas por invitación. En el curso de la demo, todos los alumnos y la profesora; en los demás,
 * los alumnos de ALUMNOS_EXTRA. El admin no necesita matrícula: pasa las comprobaciones de acceso en todos los cursos.
 */
export function construirMatriculas(catalogos: CatalogoSeed[], usuarios: UsuarioSeed[]): MatriculaSeed[] {
  const alumnos = usuarios.filter((u) => u.rol === "alumno");
  const [principal, ...resto] = catalogos;
  const deLaDemo = usuarios
    .filter((u) => u.rol !== "admin")
    .map((u): MatriculaSeed => ({
      cursoSlug: principal.curso.slug,
      email: u.email,
      rolEnCurso: u.rol === "profesor" ? "profesor" : "alumno",
    }));
  const extra = resto.flatMap(({ curso }) =>
    (ALUMNOS_EXTRA[curso.slug] ?? [])
      .map((i) => alumnos[i])
      .filter((a) => a !== undefined)
      .map((a): MatriculaSeed => ({ cursoSlug: curso.slug, email: a.email, rolEnCurso: "alumno" })),
  );
  return [...deLaDemo, ...extra];
}

/** Fila de `plantilla_ejercicio`, con el módulo por su clave natural (curso y slug) en vez de por id. */
export interface PlantillaSeed {
  cursoSlug: string;
  moduloSlug: string;
  tipos: TipoEjercicio[];
  ejemplos: EjercicioBase[];
  indicaciones: string | null;
}

/**
 * Las plantillas de ejercicios del profesor (data/ejemplos-profesor/<modulo>.json, #12) de un curso:
 * una por módulo, que es lo que admite la tabla. Falla si un fichero es de un módulo que no está en el curso
 * o si dos son del mismo módulo, para no sembrar una plantilla huérfana ni pisar una con otra.
 */
export function construirPlantillas(catalogo: CatalogoSeed, plantillas: PlantillaEjercicios[]): PlantillaSeed[] {
  const modulos = new Set(catalogo.modulos.map((m) => m.slug));
  const vistos = new Set<string>();
  return plantillas.map((p) => {
    if (!modulos.has(p.moduloId)) {
      throw new Error(`La plantilla de ejercicios es del módulo "${p.moduloId}", que no está en el curso "${catalogo.curso.slug}".`);
    }
    if (vistos.has(p.moduloId)) throw new Error(`Hay dos plantillas de ejercicios del módulo "${p.moduloId}": solo cabe una.`);
    vistos.add(p.moduloId);
    return {
      cursoSlug: catalogo.curso.slug,
      moduloSlug: p.moduloId,
      tipos: p.tipos,
      ejemplos: p.ejemplos,
      indicaciones: p.indicaciones ?? null,
    };
  });
}

const HOSTS_LOCALES = new Set(["localhost", "127.0.0.1"]);

/**
 * El seed (y los scripts que escriben en la BBDD, como el generador de ejercicios) solo escriben en la BBDD local,
 * salvo que se pida a propósito con la variable `variable`=1, para no escribir en otra BBDD por tener una
 * DATABASE_URL equivocada.
 */
export function comprobarDestino(
  url: string | undefined,
  permitirRemoto: boolean,
  variable = "SEED_PERMITIR_REMOTO",
): { permitido: boolean; motivo?: string } {
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
    motivo: `DATABASE_URL apunta a "${host}", que no es la BBDD local. Si de verdad quieres escribir en esa BBDD, repite con ${variable}=1.`,
  };
}
