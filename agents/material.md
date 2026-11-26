# Agente: Generador de material común

> Issues #2 y #15 · Código: `src/lib/agentes/material.ts` · Se ejecuta con `npm run generar:material`

## Qué hace

Genera, **una vez por vídeo** (clase), un resumen por apartados y un juego de tarjetas de estudio a partir de la transcripción de ese vídeo. El resultado se guarda en la tabla `material_clase` (una fila de tipo `resumen` y otra de tipo `tarjetas`), lo revisa una persona y lo ven todos los alumnos. La pantalla del módulo junta el material de sus vídeos en orden. Sigue el flujo de [`docs/bbdd/README.md`](../docs/bbdd/README.md#4-cómo-guarda-la-ia-el-material-que-genera).

## Modelo y por qué

`gemma-4-26b-a4b-it` en Scaleway (UE), sin razonamiento. Como se ejecuta una vez por vídeo y no por alumno, su coste es despreciable (menos de 0,001 € por vídeo). Si la calidad no basta, se puede cambiar `AI_MODEL_GENERADOR` por un modelo mayor sin tocar el código.

## Entrada

- La transcripción **de ese vídeo**, con marcas `[vídeo @segundo]`.
- El título del módulo, el del vídeo y los conceptos del módulo.

**No recibe ningún dato de alumnos.**

## Salida

```json
{
  "resumen": [{ "titulo": "...", "texto": "...", "fuente": { "videoId": "v04", "segundo": 94 } }],
  "tarjetas": [{ "pregunta": "...", "respuesta": "...", "fuente": { "videoId": "v05", "segundo": 38 } }]
}
```

El código lo valida: descarta apartados o tarjetas vacíos o repetidos y fuentes inventadas o de otro vídeo, se queda con un máximo de 3 apartados y 6 tarjetas, y exige al menos 2 apartados y 4 tarjetas. Si no los hay, falla y no guarda nada.

## Límites

- Solo el contenido del temario: nada de conocimiento externo.
- **Revisión humana obligatoria:** se guarda con `revisado = false` y los alumnos no lo ven hasta que alguien lo comprueba y lo cambia a `true` (con `npm run db:studio`).
- Si ya existe, no se regenera salvo que se use `--forzar`, y lo revisado no se pisa nunca.

## Instrucciones (prompt de sistema)

Variables: `{{modulo}}`, `{{video}}`, `{{conceptos}}` y `{{temario}}`.

```prompt
Eres un profesor que prepara material de repaso del vídeo «{{video}}», del módulo «{{modulo}}», para alumnos que estudian desde el móvil.
Conceptos del módulo: {{conceptos}}. Céntrate en los que explica este vídeo.

Usa SOLO la información del TEMARIO de abajo. No añadas nada que no esté en él.

Genera:
1. "resumen": entre 2 y 3 apartados que cubran lo que explica el vídeo. Cada apartado tiene un "titulo" corto y un "texto" de 40 a 80 palabras, claro y directo, con un ejemplo si el temario lo da. Puedes marcar código con `comillas invertidas`.
2. "tarjetas": entre 4 y 6 tarjetas de estudio. Cada una tiene una "pregunta" que se pueda responder en una o dos frases y su "respuesta". Mezcla preguntas de definición, de "¿qué pasa si…?" y de cálculo cuando el temario lo permita.

En cada apartado y cada tarjeta, indica en "fuente" el vídeo y el segundo de donde sale, usando las marcas [vídeo @segundo] del temario. No inventes fuentes.

Responde SOLO con un objeto JSON, sin texto antes ni después:
{"resumen": [{"titulo": "...", "texto": "...", "fuente": {"videoId": "v04", "segundo": 94}}], "tarjetas": [{"pregunta": "...", "respuesta": "...", "fuente": {"videoId": "v04", "segundo": 94}}]}

TEMARIO
{{temario}}
```
