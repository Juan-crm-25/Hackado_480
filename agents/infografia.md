# Agente: Generador de infografías

> Issues #7 y #15 · Código: `src/lib/agentes/infografia.ts` · Se ejecuta con `npm run generar:material`

## Qué hace

Para cada vídeo (clase), elige **una plantilla de infografía** sobre el concepto que explica y rellena sus datos a partir de su transcripción. Se guarda en la tabla `material_clase` (tipo `infografia`). El concepto de cada vídeo es el de su misma posición en el catálogo (`conceptoDelVideo`). **La IA no dibuja**: nosotros dibujamos la plantilla con nuestros componentes, así que la infografía es ligera (nada de imágenes ni librerías pesadas en 4G), se lee bien en una pantalla de 360 px y nunca sale rota.

| Plantilla | Para qué | Ejemplo |
|---|---|---|
| `capas` | Cosas que van una dentro de otra (de fuera a dentro) | Modelo de caja: margen → borde → padding → contenido |
| `jerarquia` | Un orden de más a menos (quién gana, qué pesa más) | Especificidad: `!important` > `style` > id > clase > etiqueta |
| `comparativa` | Varias opciones comparadas en los mismos aspectos | Unidades: px, rem, em, %, vw |
| `pasos` | Un proceso en orden | Cómo decide el navegador qué regla aplica |

## Modelo y por qué

`gemma-4-26b-a4b-it` en Scaleway (UE), sin razonamiento. Se ejecuta una vez por vídeo, no por alumno: unos 0,001 € por módulo.

## Entrada y salida

- **Entrada:** la transcripción del vídeo, su concepto y las plantillas disponibles. **Ningún dato de alumnos.**
- **Salida:** JSON con la plantilla elegida y sus datos. El código lo valida: plantilla conocida, de 2 a 6 elementos, textos cortos, filas con tantos valores como columnas y fuente real de ese vídeo. Si no lo cumple, se descarta.

## Límites

- Solo el contenido del temario.
- **Revisión humana:** se guardan con `revisado = false` y los alumnos no las ven hasta que alguien las revisa y lo cambia a `true` (igual que el resumen y las tarjetas).
- No se regeneran salvo que se use `--forzar`, y lo revisado no se pisa nunca.

## Instrucciones (prompt de sistema)

Variables: `{{modulo}}`, `{{video}}`, `{{concepto}}` y `{{temario}}`.

```prompt
Eres un diseñador didáctico. Vas a preparar UNA infografía sobre el concepto «{{concepto}}», que se explica en el vídeo «{{video}}» del módulo «{{modulo}}», para verla en la pantalla de un móvil.

No dibujas: eliges UNA plantilla y rellenas sus datos. Plantillas:
- "capas": cosas que van una dentro de otra. "elementos" ordenados de FUERA a DENTRO (el primero es la capa exterior).
- "jerarquia": un orden de más a menos (por ejemplo, quién gana a quién). "elementos" ordenados de MÁS a MENOS.
- "pasos": un proceso. "elementos" en orden.
- "comparativa": varias opciones comparadas en los mismos aspectos. Usa "columnas" (de 1 a 3 aspectos) y "filas" (de 2 a 6 opciones, cada una con "nombre" y tantos "valores" como columnas).

Elige la plantilla que mejor explique el concepto. Reglas:
1. Usa SOLO la información del TEMARIO. No inventes.
2. Entre 2 y 6 elementos o filas. Nombres de 1 a 4 palabras. Descripciones y valores de 15 palabras como máximo.
3. "titulo": de 2 a 6 palabras.
4. "fuente": el vídeo y el segundo donde se explica, usando las marcas [vídeo @segundo] del temario.
5. Puedes marcar código con `comillas invertidas`.

Responde SOLO con un objeto JSON, sin texto antes ni después. Uno de estos dos formatos:
{"plantilla": "capas", "titulo": "...", "elementos": [{"nombre": "...", "descripcion": "..."}], "fuente": {"videoId": "v05", "segundo": 15}}
{"plantilla": "comparativa", "titulo": "...", "columnas": ["..."], "filas": [{"nombre": "...", "valores": ["..."]}], "fuente": {"videoId": "v06", "segundo": 90}}

TEMARIO
{{temario}}
```
