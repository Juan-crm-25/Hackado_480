/**
 * Material personal a petición de un alumno (#2). Instrucciones en agents/material-personal.md.
 * Las opciones cerradas (tipo, concepto, nivel) van en las instrucciones; el enfoque libre del alumno,
 * filtrado, va en el mensaje del usuario para que no pueda cambiar las reglas.
 */
import { completar as completarIA } from "../ai/cliente";
import { contenidoDelCurso, filtrarTexto } from "../ai/privacidad";
import { temarioDelModulo } from "../transcripciones";
import type { MaterialPersonal, Modulo, NivelMaterial, PeticionMaterialPersonal } from "../types";
import { leerInstrucciones, rellenar } from "./instrucciones";
import { validarSecciones, validarTarjetas } from "./material";
import { parsearObjetoJson } from "./validacion";

export const MAX_ENFOQUE = 200;

const NIVELES: Record<NivelMaterial, string> = {
  basico: "más sencillo de lo normal: frases cortas, sin tecnicismos innecesarios y con un ejemplo muy simple.",
  normal: "el del curso.",
  avanzado: "más exigente: matices, casos límite y preguntas que obliguen a razonar, siempre dentro del temario.",
};

const FORMATOS = {
  resumen:
    'Genera "resumen": entre 1 y 4 apartados, cada uno con "titulo" corto y "texto" de 40 a 80 palabras.\nResponde SOLO con JSON: {"resumen": [{"titulo": "...", "texto": "...", "fuente": {"videoId": "v04", "segundo": 94}}]}',
  tarjetas:
    'Genera "tarjetas": entre 4 y 8 tarjetas, cada una con "pregunta" y "respuesta" breves.\nResponde SOLO con JSON: {"tarjetas": [{"pregunta": "...", "respuesta": "...", "fuente": {"videoId": "v04", "segundo": 94}}]}',
} as const;

export interface EntradaMaterialPersonal {
  modulo: Modulo;
  peticion: PeticionMaterialPersonal;
  nombresOcultos: string[];
}

export interface DependenciasMaterialPersonal {
  completar: typeof completarIA;
  temario: (modulo: Modulo) => string;
  ahora: () => Date;
  id: () => string;
}

const dependenciasReales: DependenciasMaterialPersonal = {
  completar: completarIA,
  temario: (m) => temarioDelModulo(m),
  ahora: () => new Date(),
  id: () => crypto.randomUUID(),
};

export class ErrorMaterial extends Error {}

export async function generarMaterialPersonal(
  { modulo, peticion, nombresOcultos }: EntradaMaterialPersonal,
  deps: DependenciasMaterialPersonal = dependenciasReales,
): Promise<MaterialPersonal> {
  const temario = deps.temario(modulo);
  if (!temario) throw new ErrorMaterial(`Todavía no tengo el contenido de los vídeos del módulo «${modulo.titulo}».`);

  const concepto = peticion.conceptoId ? modulo.conceptos.find((c) => c.id === peticion.conceptoId) : undefined;
  if (peticion.conceptoId && !concepto) throw new ErrorMaterial("Ese concepto no es de este módulo.");
  const nivel: NivelMaterial = peticion.nivel && peticion.nivel in NIVELES ? peticion.nivel : "normal";
  const enfoque = peticion.enfoque?.trim().slice(0, MAX_ENFOQUE) || undefined;

  const sistema = rellenar(leerInstrucciones("material-personal"), {
    modulo: modulo.titulo,
    alcance: concepto ? `solo el concepto «${concepto.nombre}».` : "todo el módulo.",
    nivel: NIVELES[nivel],
    formato: FORMATOS[peticion.tipo],
    temario,
  });

  // Se filtra el mensaje entero: lleva el enfoque, que escribe el alumno.
  const pedido = filtrarTexto(enfoque ? `Prepárame el material. Mi enfoque: ${enfoque}` : "Prepárame el material.", nombresOcultos).texto;

  const r = await deps.completar({
    modelo: "tutor",
    formatoJson: true,
    maxTokens: 1500,
    temperatura: 0.4,
    mensajes: [
      { rol: "sistema", contenido: contenidoDelCurso(sistema) },
      { rol: "usuario", contenido: pedido },
    ],
  });
  if (r.simulado) throw new ErrorMaterial("La IA no está configurada (modo simulado).");

  const datos = parsearObjetoJson(r.texto);
  const base: MaterialPersonal = {
    id: deps.id(),
    alumnoId: peticion.alumnoId,
    moduloId: modulo.id,
    tipo: peticion.tipo,
    conceptoId: concepto?.id,
    nivel,
    enfoque,
    generado: deps.ahora().toISOString(),
  };

  if (peticion.tipo === "resumen") {
    const resumen = validarSecciones(datos?.resumen, modulo, 4);
    if (resumen.length < 1) throw new ErrorMaterial("No he podido crear un resumen con esas indicaciones. Prueba con otro enfoque o déjalo vacío.");
    return { ...base, resumen };
  }
  const tarjetas = validarTarjetas(datos?.tarjetas, modulo, 8);
  if (tarjetas.length < 3) throw new ErrorMaterial("No he podido crear tarjetas con esas indicaciones. Prueba con otro enfoque o déjalo vacío.");
  return { ...base, tarjetas };
}
