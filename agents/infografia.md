# Agente: Generador de infografías

> Issue #7 · Código: `src/lib/agentes/infografia.ts` · Se ejecuta con `npm run generar:infografias`

## Qué hace

Para cada concepto del módulo, elige **una plantilla de infografía** y rellena sus datos a partir de las transcripciones. **La IA no dibuja**: nosotros dibujamos la plantilla con nuestros componentes, así que la infografía es ligera (nada de imágenes ni librerías pesadas en 4G), se lee bien en una pantalla de 360 px y nunca sale rota.

| Plantilla | Para qué | Ejemplo |
|---|---|---|
| `capas` | Cosas que van una dentro de otra (de fuera a dentro) | Modelo de caja: margen → borde → padding → contenido |
| `jerarquia` | Un orden de más a menos (quién gana, qué pesa más) | Especificidad: `!important` > `style` > id > clase > etiqueta |
| `comparativa` | Varias opciones comparadas en los mismos aspectos | Unidades: px, rem, em, %, vw |
| `pasos` | Un proceso en orden | Cómo decide el navegador qué regla aplica |

## Modelo y por qué

`gemma-4-26b-a4b-it` en Scaleway (UE), sin razonamiento. Se ejecuta una vez por concepto, no por alumno: unos 0,001 € por módulo.

## Entrada y salida

- **Entrada:** el temario del módulo, el concepto y las plantillas disponibles. **Ningún dato de alumnos.**
- **Salida:** JSON con la plantilla elegida y sus datos. El código lo valida: plantilla conocida, de 2 a 6 elementos, textos cortos, filas con tantos valores como columnas y fuente real. Si no lo cumple, se descarta.

## Límites

- Solo el contenido del temario.
- **Revisión humana:** se guardan con `"revisado": false` y los alumnos no las ven hasta que alguien las revisa y lo cambia a `true` (igual que el material común).
- No se sobrescriben salvo que se use `--forzar`.

## Instrucciones (prompt de sistema)

Variables: `{{modulo}}`, `{{concepto}}` y `{{temario}}`.

```prompt
Eres un diseñador didáctico. Vas a preparar UNA infografía sobre el concepto «{{concepto}}» del módulo «{{modulo}}», para verla en la pantalla de un móvil.

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
