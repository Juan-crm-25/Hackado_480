# evaluaciones

Diagnóstico rápido por módulo (#6), tests y exámenes con nota.

- **Tablas:** evaluacion, pregunta_evaluacion, intento_evaluacion, progreso, matricula
- **Endpoints:** `GET/POST /api/modulos/:id/diagnostico`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).

## Uso

- `obtenerDiagnosticoModulo(usuario, moduloSlug)`: devuelve las 3 preguntas del diagnóstico rápido del módulo sin incluir la solución. Exige sesión (401) y matrícula en el curso (403).
- `responderDiagnosticoModulo(usuario, moduloSlug, { respuestas })`: corrige por código (sin IA). Si el alumno acierta las 3 preguntas, marca el módulo como `dominado` en `progreso` (sin darlo por `completado`, que requiere los ejercicios de verificación) y baja el módulo al final de `matricula.orden_modulos` usando `ordenarRuta()`.