# tutor

Conversaciones con el tutor IA del módulo (caducan a los 90 días) y límite diario de consultas.

- **Tablas:** conversacion, mensaje, uso_ia, duda_humana
- **Endpoints:** `POST /api/tutor`, `POST/GET /api/tutor/humano`, `GET /api/radar/dudas`, `POST /api/radar/dudas/[id]/respuesta`
- **`consultarTutor()`:** el alumno es el usuario de la sesión; exige el curso (`requerirAccesoCurso()`), el límite diario, llama a la IA y guarda la conversación. Devuelve `preguntaId`.
- **Tutor humano (H9):** `pasarATutorHumano()` (solo la pregunta propia), `listarMisDudasHumanas()`, `listarDudasHumanasDelCurso()` y `responderDudaHumana()` (profesor de ESE curso o admin; una sola respuesta). La respuesta la escribe el profesor, sin IA.
- **`servicio.ts` → `registrarIntercambio()`:** guarda cada pregunta y su respuesta para el Radar (#5). Filtra los dos textos antes de guardarlos (sin nombre, email, teléfono ni DNI), igual que antes de enviarlos a la IA.
- **`repositorio.ts`:** `guardarIntercambio()` usa la conversación vigente del alumno en ese módulo (o abre una si la anterior ha caducado) y guarda los dos mensajes en una transacción; `listarMensajes()` los devuelve en orden; `sumarUsoIa()` lleva el límite diario.

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
