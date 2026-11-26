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
| `POST /api/tutor` | `RespuestaTutor` | ✅ Real (IA). Límite diario en la tabla `uso_ia`. Guarda cada pregunta y respuesta, ya filtradas, en `conversacion` y `mensaje` (para el Radar). Necesita el seed (`npm run db:seed`); si no, 404. Solo m2-css tiene transcripciones (de prueba) | #11 transcripciones reales, #13 login |
| `GET /api/radar` | `InformeRadar` | 🧪 Prueba | #5 |
| `GET /api/modulos/:id/material` | `MaterialComun` (resumen + tarjetas) | ✅ Real (lee `data/material/`; no llama a la IA). Solo si está **revisado**; si no, 404 | #2 |
| `POST /api/material-personal` | `RespuestaMaterialPersonal` | ✅ Real (IA). Cuenta para el límite diario. Errores 400/404/422/429/502 | #2 |
| `GET /api/material-personal?alumnoId=&moduloId=` | `MaterialPersonal[]` | ✅ Real (tabla `material_personal`). Necesita el seed (`npm run db:seed`); si no, 404 | #13 login |
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
{ "alumnoId": "a1", "moduloId": "m2-css", "mensaje": "¿Qué es la especificidad?", "historial": [] }

// Respuesta (RespuestaTutor)
{
  "mensaje": { "rol": "tutor", "texto": "…", "fuentes": [{ "videoId": "v04", "segundo": 125 }] },
  "fueraDeTemario": false,
  "consultasRestantes": 29
}
```

Errores: `400` (faltan campos o la pregunta supera 1.000 caracteres), `404` (módulo o alumno), `429` (límite diario alcanzado), `502` (la IA no responde). El mensaje de `error` se puede mostrar al alumno tal cual.
Detalle del agente: [agents/tutor.md](../agents/tutor.md).

## Reglas

- **Privacidad:** ningún endpoint envía a la IA el nombre, el email ni la edad del alumno. Todo pasa por la capa de privacidad (#9).
- **Ejercicios:** la solución y la rúbrica nunca se envían al cliente.
- **Integración futura:** cuando exista la BBDD, cada intento y cada consulta al tutor se guardarán también como evento xAPI (SPEC, apartado 5).
- **Cambios en el contrato:** si cambias un tipo o la forma de una respuesta, actualiza este fichero y avisa por WhatsApp antes de fusionar.
