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
// Para qué test es cada ejercicio del banco: el de cada vídeo (desbloquea el siguiente), el del módulo (lo completa)
// o el examen del curso (más difíciles). Así un mismo ejercicio no sale en dos tests.
export const usoEjercicio = pgEnum("uso_ejercicio", ["video", "modulo", "examen"]);
export const estadoModulo = pgEnum("estado_modulo", ["pendiente", "en_curso", "dominado", "completado"]);

export const tipoEvaluacion = pgEnum("tipo_evaluacion", ["diagnostico", "test", "examen"]);

export const rolMensaje = pgEnum("rol_mensaje", ["alumno", "tutor"]);

// Foro (H10): la IA o el profesor deciden si un comentario responde a la duda y cómo de bien.
// correcta = +10 puntos, aproximada = +5, incorrecta y no_respuesta = 0 (los puntos se calculan, no se guardan).
export const validacionForo = pgEnum("validacion_foro", ["pendiente", "correcta", "aproximada", "incorrecta", "no_respuesta"]);
/** Por qué da puntos el profesor en el foro (+1, +3 o +6). */
export const motivoPuntoForo = pgEnum("motivo_punto_foro", ["buena_pregunta", "buena_conducta"]);
export const validadorForo = pgEnum("validador_foro", ["ia", "profesor"]);

/** Qué mueve el saldo de puntos del perfil: un canje de premio (resta) o los puntos de demo del MVP (suman). */
export const tipoMovimientoPuntos = pgEnum("tipo_movimiento_puntos", ["canje", "demo"]);
