import { pgEnum } from "drizzle-orm/pg-core";

// Conjuntos de valores fijos. Los que también existen en src/lib/types.ts deben coincidir (lo comprueba schema.test.ts).

export const rolUsuario = pgEnum("rol_usuario", ["alumno", "profesor", "admin"]);

export const usoImagen = pgEnum("uso_imagen", ["portada", "banner", "miniatura", "galeria"]);
export const tipoDocumento = pgEnum("tipo_documento", ["transcripcion", "apuntes"]);

export const estadoPedido = pgEnum("estado_pedido", ["pendiente", "pagado", "fallido", "reembolsado"]);
export const origenMatricula = pgEnum("origen_matricula", ["compra", "invitacion"]);
export const rolEnCurso = pgEnum("rol_en_curso", ["alumno", "profesor"]);

export const tipoMaterial = pgEnum("tipo_material", ["resumen", "tarjetas", "infografia"]);
// El material personal no tiene infografía.
export const tipoMaterialPersonal = pgEnum("tipo_material_personal", ["resumen", "tarjetas"]);
export const nivelMaterial = pgEnum("nivel_material", ["basico", "normal", "avanzado"]);

// Lo comparten ejercicio, pregunta_evaluacion y plantilla_ejercicio.tipos.
export const tipoEjercicio = pgEnum("tipo_ejercicio", ["test", "respuesta_corta", "abierta", "codigo"]);
export const estadoEjercicio = pgEnum("estado_ejercicio", ["borrador", "aprobado"]);
export const estadoModulo = pgEnum("estado_modulo", ["pendiente", "en_curso", "dominado", "completado"]);

export const tipoEvaluacion = pgEnum("tipo_evaluacion", ["diagnostico", "test", "examen"]);

export const rolMensaje = pgEnum("rol_mensaje", ["alumno", "tutor"]);

export const validacionForo = pgEnum("validacion_foro", ["pendiente", "buena", "no_util"]);
export const validadorForo = pgEnum("validador_foro", ["ia", "profesor"]);
