# Agente: Generador de ejercicios

> Issue #4 (H4) · Código: `src/lib/agentes/ejercicios.ts`

## Qué hace

Crea, **una vez por módulo**, el banco de ejercicios de verificación a partir de los ejemplos y el tipo de ejercicio que da el profesor. Los ejercicios se guardan en la tabla `ejercicio` como **borrador** y solo los ven los alumnos cuando una persona los aprueba.

El profesor configura cada módulo en un fichero, sin panel de administración: `data/ejemplos-profesor/<módulo>.json`, que el seed carga en la tabla `plantilla_ejercicio` (tipos de ejercicio, 2 o 3 ejemplos y sus indicaciones).

## Modelo y por qué

El de `AI_MODEL_GENERADOR` (hoy `gemma-4-26b-a4b-it` en Scaleway, UE, sin razonamiento). Se ejecuta una vez por módulo y no por alumno, así que su coste es despreciable. Si la calidad no basta, se cambia esa variable por un modelo mayor sin tocar el código.

## Entrada

- El título del módulo y sus conceptos, con su identificador.
- La plantilla del profesor: los tipos de ejercicio permitidos, los ejemplos y las indicaciones.
- El temario del módulo, con marcas `[vídeo @segundo]`.

**No recibe ningún dato de alumnos.**

## Salida

```json
{
  "ejercicios": [
    {
      "tipo": "test",
      "conceptoId": "css-especificidad",
      "enunciado": "...",
      "opciones": ["...", "...", "..."],
      "solucion": 1,
      "fuente": { "videoId": "v04", "segundo": 135 }
    }
  ]
}
```

Según el tipo:

| Tipo | Lleva | Se corrige |
|---|---|---|
| `test` | `opciones` (de 2 a 5, distintas) y `solucion`, el índice de la correcta empezando en 0 | Con código |
| `respuesta_corta` | `solucion`: la respuesta exacta, en texto | Con código |
| `abierta` | `rubrica` | Con la IA y la rúbrica |
| `codigo` | `rubrica` y, si se quiere, `solucion` con un código de referencia | Con la IA y la rúbrica |

## Validación (código, no IA)

El código descarta cada ejercicio que:

- es de un tipo que no está en la plantilla del módulo;
- no cumple las reglas de su tipo (tabla de arriba);
- cita un concepto que no es del módulo, o un vídeo que no es del módulo. El segundo se ajusta a la duración del vídeo;
- repite un enunciado.

Se queda con **3 ejercicios por concepto** como mucho (9 en un módulo de 3 conceptos). Si quedan **menos de 6** válidos, o algún concepto se queda sin ejercicios, falla y **no se guarda nada**.

## Límites

- Solo el contenido del temario: nada de conocimiento externo.
- Mismo tipo y formato que los ejemplos del profesor.
- **Revisión humana obligatoria:** todo se guarda como `borrador`. Una persona lo revisa y lo pasa a `aprobado`; los alumnos solo ven los aprobados. La IA puede ayudar a revisar, pero la decisión de aprobar es de una persona.
- Si el módulo ya tiene ejercicios, no se regenera. Al forzarlo, solo se borran los borradores: los aprobados nunca.

## En producción

El profesor no usaría herramientas de la BBDD: revisaría los borradores desde **una pantalla de la app**, solo de los cursos que enseña (`requerirProfesorDelCurso()`), con cada ejercicio legible (concepto, vídeo y minuto con enlace, solución o rúbrica) y los botones aprobar, corregir y descartar. Por debajo cambia la misma columna `estado`. El generador se lanzaría solo, en segundo plano, al guardar la plantilla o subir vídeos nuevos al módulo.

## Instrucciones (prompt de sistema)

Variables: `{{modulo}}`, `{{conceptos}}`, `{{tipos}}`, `{{ejemplos}}`, `{{indicaciones}}`, `{{total}}` y `{{temario}}`.

```prompt
Eres un profesor que prepara los ejercicios de verificación del módulo «{{modulo}}». Sirven para comprobar que el alumno ha entendido los vídeos del módulo, y los resuelve desde el móvil.

Conceptos del módulo (usa su identificador en "conceptoId"):
{{conceptos}}

Tipos de ejercicio que quiere el profesor: {{tipos}}. No uses ningún otro.

Ejemplos del profesor. Copia su estilo, su nivel y su formato, pero no los repitas:
{{ejemplos}}

Indicaciones del profesor:
{{indicaciones}}

Genera {{total}} ejercicios: 3 por cada concepto, repartidos entre los tipos permitidos. Cada ejercicio comprueba UNA idea concreta que se explica en el TEMARIO de abajo. Usa SOLO la información del temario: no preguntes nada que no se explique en él.

Reglas de cada tipo:
- "test": "opciones" con 3 o 4 respuestas distintas y una sola correcta; "solucion" es el número de la correcta, empezando en 0. Las incorrectas deben ser errores creíbles.
- "respuesta_corta": "solucion" es la respuesta exacta y corta, en texto. Pide algo que tenga una única respuesta.
- "abierta": "rubrica" dice qué tiene que explicar el alumno y cuándo la respuesta es completa, parcial o incorrecta.
- "codigo": pide un código corto que quepa en el móvil. "rubrica" dice qué tiene que tener el código; "solucion" es un código de referencia.

En cada ejercicio, indica en "fuente" el vídeo y el segundo donde se explica lo que pregunta, usando las marcas [vídeo @segundo] del temario. Es el momento al que se enviará al alumno si falla. No inventes fuentes.

Responde SOLO con un objeto JSON, sin texto antes ni después:
{"ejercicios": [{"tipo": "test", "conceptoId": "...", "enunciado": "...", "opciones": ["...", "...", "..."], "solucion": 0, "fuente": {"videoId": "v04", "segundo": 94}}, {"tipo": "abierta", "conceptoId": "...", "enunciado": "...", "rubrica": "...", "fuente": {"videoId": "v05", "segundo": 38}}]}

TEMARIO
{{temario}}
```
