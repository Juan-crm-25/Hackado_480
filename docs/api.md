# API — contrato

Todos los endpoints viven en `src/app/api/` y usan los tipos de [`src/lib/types.ts`](../src/lib/types.ts).
Hoy devuelven **datos de prueba** (`src/lib/datos-prueba.ts`). Cada bloque los sustituye por la implementación real **sin cambiar la forma de las respuestas**.

Los errores siempre tienen la forma `{ "error": "mensaje" }` (`ErrorApi`).

| Método y ruta | Devuelve | Estado | Issue que lo completa |
|---|---|---|---|
| `GET /api/catalogo` | `Curso` | ✅ Real (lee `data/catalog.json`) | #11 rellena el contenido |
| `GET /api/modulos/:id` | `Modulo` | ✅ Real | — |
| `GET /api/modulos/:id/ejercicios` | `EjercicioPublico[]` (sin solución ni rúbrica) | 🧪 Prueba. El banco ya se genera en la tabla `ejercicio` (#4, `npm run generar:ejercicios`); falta que el endpoint lea los aprobados | #3 selección |
| `POST /api/intentos` | `Intento` | 🧪 Test corregido por código; abiertas pendientes | #3 corrector, #13 guardar |
| `GET /api/progreso?alumnoId=` | `Progreso[]` | 🧪 Prueba | #13 |
| `POST /api/tutor` | `RespuestaTutor` | ✅ Real (IA). El alumno es el **usuario de la sesión** (401 sin sesión, 403 sin el curso); `alumnoId` ya no se usa. Límite diario en `uso_ia` (429). Guarda cada pregunta y respuesta, ya filtradas, en `conversacion` y `mensaje` (para el Radar) y devuelve `preguntaId` | #1, #5 |
| `GET /api/radar?curso=<slug>` | `InformeRadar` | ✅ Real: alumnos atascados o inactivos, conceptos más fallados y dudas frecuentes, calculado con código (sin IA). Solo el profesor de ese curso o un admin (403 si no). Pantalla: `/radar` | #5 |
| `GET /api/radar/resumen?curso=<slug>` | `RespuestaResumenDudas` | ✅ Real (IA, agente analista): resumen de las dudas al tutor para el profesor. Mismos permisos que el Radar. Caché de 1 hora por curso; 502 si la IA falla (el resto del Radar sigue) | #5 |
| `POST /api/tutor/humano` | `DudaHumana` | ✅ El alumno pasa **su** pregunta (`preguntaId` de `POST /api/tutor`) a su profesor (H9). Ajena o inexistente: 404. Pasarla dos veces no la duplica | H9 |
| `GET /api/tutor/humano?modulo=<slug>` | `DudaHumana[]` | ✅ Las dudas que el alumno ha pasado en ese módulo, con la respuesta del profesor cuando la hay | H9 |
| `GET /api/radar/dudas?curso=<slug>` | `DudaHumanaProfesor[]` | ✅ Para el Radar: pendientes y respondidas en los últimos 7 días. Solo el profesor de ese curso o un admin | H9 |
| `POST /api/radar/dudas/[id]/respuesta` | `DudaHumanaProfesor` | ✅ El profesor responde (sin IA, máximo 2.000 caracteres). Ya respondida: 409 | H9 |
| `GET /api/modulos/:id/material` | `MaterialComun` (resumen + tarjetas) | ✅ Real (lee `data/material/`; no llama a la IA). Solo si está **revisado**; si no, 404 | #2 |
| `POST /api/material-personal` | `RespuestaMaterialPersonal` | ✅ Real (IA). El alumno es el **usuario de la sesión** (401 sin sesión, 403 sin el curso); `alumnoId` ya no se usa. Cuenta para su límite diario (429). Si no se puede generar con esas indicaciones o el módulo no tiene transcripciones: 400; si falla la IA: 502 | #2 |
| `GET /api/material-personal?moduloId=` | `MaterialPersonal[]` | ✅ Real (tabla `material_personal`): **solo el material del usuario de la sesión** | #2 |
| `GET /api/modulos/:id/infografias` | `InfografiasModulo` | ✅ Real (lee `data/infografias/`; no llama a la IA). Solo si está **revisado**; si no, 404 | #7 |

## Ejemplos

### `POST /api/intentos`

```json
// Petición (PeticionIntento)
{ "alumnoId": "a1", "ejercicioId": "e-m2-1", "respuesta": 0 }

// Respuesta (Intento)
{
  "id": "…",
  "alumnoId": "a1",
  "ejercicioId": "e-m2-1",
  "respuesta": 0,
  "correcto": false,
  "puntuacion": 0,
  "feedback": "No es correcto. Repasa este momento del vídeo.",
  "repasar": { "videoId": "v04", "segundo": 0 },
  "fecha": "2026-11-24T10:00:00.000Z"
}
```

### `POST /api/tutor`

```json
// Petición (PeticionTutor)
// Con la cookie de sesión: el alumno sale de ella.
{ "moduloId": "m2-css", "mensaje": "¿Qué es la especificidad?", "historial": [] }

// Respuesta (RespuestaTutor)
{
  "mensaje": { "rol": "tutor", "texto": "…", "fuentes": [{ "videoId": "v04", "segundo": 125 }] },
  "fueraDeTemario": false,
  "consultasRestantes": 29,
  "preguntaId": "…"
}
```

Errores: `400` (pregunta vacía o de más de 1.000 caracteres), `401` (sin sesión), `403` (no tiene el curso), `404` (módulo), `429` (límite diario alcanzado), `502` (la IA no responde). El mensaje de `error` se puede mostrar al alumno tal cual.
Detalle del agente: [agents/tutor.md](../agents/tutor.md).

## Reglas

- **Privacidad:** ningún endpoint envía a la IA el nombre, el email ni la edad del alumno. Todo pasa por la capa de privacidad (#9).
- **Ejercicios:** la solución y la rúbrica nunca se envían al cliente.
- **Integración futura:** cuando exista la BBDD, cada intento y cada consulta al tutor se guardarán también como evento xAPI (SPEC, apartado 5).
- **Cambios en el contrato:** si cambias un tipo o la forma de una respuesta, actualiza este fichero y avisa por WhatsApp antes de fusionar.
