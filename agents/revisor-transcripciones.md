# Agente: Revisor de transcripciones

> Issue #11 · **Diseñado para producción: no se ejecuta en el prototipo** (ver [SPEC.md, apartado 8](../SPEC.md#8-contenido) y [decisiones, apartado 4](../docs/decisiones.md#4-vídeos-y-transcripciones-del-prototipo)). No tiene código todavía.

## Qué hace

Corrige los errores de una transcripción automática antes de guardarla: sobre todo el **vocabulario técnico** que el reconocimiento de voz escribe mal. No resume, no reescribe y no cambia los tiempos.

| La transcripción dice | Debería decir |
|---|---|
| `document create Element` | `document.createElement` |
| `un dip`, `es hundido` | `un div`, `es un div` |
| `a pen`, `appen` | `append` |
| `Lee` (en una lista) | `li` |
| `Cloud` (al copiar nodos) | `cloneNode` |
| `0 10 para las clases` | `(0,1,0) para las clases` |

## Por qué hace falta (en producción)

- **Búsqueda por fragmentos (RAG):** con 400 vídeos, el tutor no recibe el módulo entero sino los fragmentos que encajan con la pregunta. Si el alumno pregunta por `div` y la transcripción dice «dip», ese fragmento no aparece.
- **Reutilización:** la transcripción se guarda como documento de la clase y alimenta resúmenes, tarjetas, infografías y ejercicios. Un error se copia a todo lo que se genera con ella.
- **Lo que el contexto no arregla:** en nuestras pruebas, el tutor corrigió solo «create Element», pero con el «0 10» de la especificidad explicó mal los valores.

Whisper, que se usaría para los vídeos sin transcripción, falla menos que los subtítulos automáticos de YouTube, pero sigue fallando en nombres de código y en números dictados. Por eso el revisor va **después** de Whisper.

## Dónde encaja

No lo lanza nadie a mano: forma parte del trabajo en segundo plano que se dispara cuando un profesor sube un vídeo.

1. Whisper → VTT con marcas de tiempo.
2. Limpieza con código (quita repeticiones y etiquetas).
3. **Revisor de transcripciones** (este agente).
4. Código: conversión a markdown con marcas `[mm:ss]` y guardado en la tabla `documento`.
5. Un profesor puede revisarla antes de publicar.

La IA no escribe en la BBDD ni toca los tiempos: devuelve texto y el código hace el resto.

## Modelo y por qué

`gemma-4-26b-a4b-it` en Scaleway (UE), sin razonamiento, el mismo que el resto de agentes. Es una tarea sencilla de texto y se ejecuta **una vez por vídeo**, no por alumno.

**Coste:** la salida es tan larga como la entrada. Un vídeo de 15 minutos (la media del catálogo de 5 a 25) tiene unos 4.000 tokens: ≈ 0,001 € de entrada + 0,002 € de salida ≈ **0,003 € por vídeo**. Los 12 del prototipo (unos 33.000 tokens), unos 3 céntimos; los 400 del catálogo, alrededor de **1 €**, una sola vez.

## Entrada y salida

- **Entrada:** título del vídeo, nombre del módulo, sus conceptos y un lote de unos 20 bloques de texto **sin las marcas de tiempo**, numerados. **Ningún dato de alumnos.**
- **Salida:** JSON con los mismos bloques, en el mismo orden, corregidos.
- **El código valida** cada lote antes de usarlo:
  - Mismo número de bloques y los mismos números.
  - Cada bloque mide entre el 80 % y el 120 % del original. Si cambia más, ha resumido o inventado.
  - Si un bloque no pasa la validación, se conserva el **original**.

  Después, el código vuelve a poner las marcas de tiempo, que la IA nunca ve.

## Límites

- Solo corrige errores de transcripción. No mejora el estilo, no añade explicaciones y no quita muletillas.
- Ante la duda, deja el texto como está.
- La transcripción revisada se guarda como `documento` y un profesor puede corregirla.

## Instrucciones (prompt de sistema)

Variables: `{{video}}`, `{{modulo}}` y `{{conceptos}}`. Los bloques van en el mensaje del usuario como JSON: `{"bloques": [{"n": 1, "texto": "..."}, ...]}`.

```prompt
Eres un corrector de transcripciones de vídeos de un curso de programación web en español. Recibes trozos de la transcripción automática del vídeo «{{video}}», del módulo «{{modulo}}». Conceptos del módulo: {{conceptos}}.

La transcripción viene de un reconocimiento de voz y tiene errores típicos: nombres de código separados o mal escritos («create Element» es createElement, «dip» es div, «a pen» es append), etiquetas HTML escritas como palabras («Lee» puede ser li) y números dictados («cero uno cero» o «0 10» pueden ser (0,1,0)).

REGLAS
1. Corrige SOLO errores de transcripción: palabras mal reconocidas, nombres de código, etiquetas, propiedades y números. Escribe el código tal como se escribe (createElement, addEventListener, justify-content, rem).
2. Añade puntuación y mayúsculas para que se lea bien.
3. NO resumas, NO añadas explicaciones, NO quites frases y NO cambies el orden. Cada bloque debe decir lo mismo que el original, con una longitud parecida.
4. Si no estás seguro de qué quiso decir el profesor, deja ese trozo como está.
5. Devuelve exactamente los mismos bloques, con el mismo "n", en el mismo orden.

FORMATO
Responde SOLO con un objeto JSON, sin texto antes ni después:
{"bloques": [{"n": 1, "texto": "..."}, {"n": 2, "texto": "..."}]}
```
