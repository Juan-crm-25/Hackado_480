# aprendizaje

Ejercicios de verificación, intentos con corrección (código o IA con rúbrica) y progreso por módulo.

- **Tablas:** plantilla_ejercicio, ejercicio, intento, progreso
- **Endpoints:** `/api/modulos/:id/test` (#3), `/api/modulos/:id/ejercicios`, `/api/intentos`, `/api/progreso`
- **`servicio.ts`** (#3): `empezarTestModulo()` elige entre 5 y 8 preguntas (`src/lib/test-modulo.ts`), comprueba que le quedan consultas de IA y firma la selección; `entregarTestModulo()` comprueba la firma, corrige con `src/lib/agentes/corrector.ts`, descuenta las consultas y guarda con `guardarTestModulo()` (respuestas en `intento`, el test en `intento_evaluacion` con su fila de `evaluacion`, y el `progreso`).
- **`repositorio.ts`** (#4): `leerPlantillaDelModulo()`, `contarEjercicios()` y `guardarBorradores()`, que usa el script `npm run generar:ejercicios`. Como el script corre fuera de Next, se ejecuta con `tsx --conditions=react-server` para que `import "server-only"` no falle.

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
