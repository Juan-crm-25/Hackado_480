# aprendizaje

Ejercicios de verificación, intentos con corrección (código o IA con rúbrica) y progreso por módulo.

- **Tablas:** plantilla_ejercicio, ejercicio, intento, progreso
- **Endpoints:** `/api/modulos/:id/ejercicios`, `/api/intentos`, `/api/progreso`
- **`repositorio.ts`** (#4): `leerPlantillaDelModulo()`, `contarEjercicios()` y `guardarBorradores()`, que usa el script `npm run generar:ejercicios`. Como el script corre fuera de Next, se ejecuta con `tsx --conditions=react-server` para que `import "server-only"` no falle.

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
