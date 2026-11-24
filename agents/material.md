# Agente: Generador de material común

> Issue #2 · Código: `src/lib/agentes/material.ts` · Se ejecuta con `npm run generar:material`

## Qué hace

Genera, **una vez por módulo**, un resumen por apartados y un juego de tarjetas de estudio a partir de las transcripciones del módulo. El resultado se guarda en `data/material/<módulo>.json`, lo revisa una persona y lo ven todos los alumnos.

> **Cambio previsto (#13):** el material pasará a generarse **por clase** y a guardarse en la tabla `material_clase` de la BBDD, siguiendo el flujo de [`docs/bbdd/README.md`](../docs/bbdd/README.md#4-cómo-guarda-la-ia-el-material-que-genera). Mientras tanto, este agente sigue escribiendo el fichero.

## Modelo y por qué

`gemma-4-26b-a4b-it` en Scaleway (UE), sin razonamiento. Como se ejecuta una vez por módulo y no por alumno, su coste es despreciable (unos 0,002 € por módulo). Si la calidad no basta, se puede cambiar `AI_MODEL_GENERADOR` por un modelo mayor sin tocar el código.

## Entrada

- El temario del módulo, con marcas `[vídeo @segundo]`.
- El título del módulo y sus conceptos.

**No recibe ningún dato de alumnos.**

## Salida

```json
{
  "resumen": [{ "titulo": "...", "texto": "...", "fuente": { "videoId": "v04", "segundo": 94 } }],
  "tarjetas": [{ "pregunta": "...", "respuesta": "...", "fuente": { "videoId": "v05", "segundo": 38 } }]
}
```

El código lo valida: descarta apartados o tarjetas vacíos o repetidos y fuentes inventadas, y exige al menos 2 apartados y 4 tarjetas. Si no los hay, falla y no guarda nada.

## Límites

- Solo el contenido del temario: nada de conocimiento externo.
- **Revisión humana obligatoria:** se guarda con `"revisado": false`, y la app lo muestra como *pendiente de revisión* hasta que alguien lo comprueba y lo cambia a `true`.
- Si el fichero ya existe, no se sobrescribe salvo que se use `--forzar`, para no perder una revisión.

## Instrucciones (prompt de sistema)

Variables: `{{modulo}}`, `{{conceptos}}` y `{{temario}}`.

```prompt
Eres un profesor que prepara material de repaso del módulo «{{modulo}}» para alumnos que estudian desde el móvil.
Conceptos del módulo: {{conceptos}}.

Usa SOLO la información del TEMARIO de abajo. No añadas nada que no esté en él.

Genera:
1. "resumen": entre 3 y 6 apartados que cubran los conceptos del módulo. Cada apartado tiene un "titulo" corto y un "texto" de 40 a 80 palabras, claro y directo, con un ejemplo si el temario lo da. Puedes marcar código con `comillas invertidas`.
2. "tarjetas": entre 6 y 10 tarjetas de estudio. Cada una tiene una "pregunta" que se pueda responder en una o dos frases y su "respuesta". Mezcla preguntas de definición, de "¿qué pasa si…?" y de cálculo cuando el temario lo permita.

En cada apartado y cada tarjeta, indica en "fuente" el vídeo y el segundo de donde sale, usando las marcas [vídeo @segundo] del temario. No inventes fuentes.

Responde SOLO con un objeto JSON, sin texto antes ni después:
{"resumen": [{"titulo": "...", "texto": "...", "fuente": {"videoId": "v04", "segundo": 94}}], "tarjetas": [{"pregunta": "...", "respuesta": "...", "fuente": {"videoId": "v04", "segundo": 94}}]}

TEMARIO
{{temario}}
```
