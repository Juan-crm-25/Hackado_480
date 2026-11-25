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

Los ejercicios, agrupados por concepto:

```json
{
  "conceptos": [
    {
      "conceptoId": "css-especificidad",
      "ejercicios": [
        {
          "tipo": "test",
          "enunciado": "...",
          "opciones": ["...", "...", "..."],
          "solucion": 1,
          "fuente": { "videoId": "v04", "segundo": 135 }
        }
      ]
    }
  ]
}
```

El concepto va una vez por grupo, no en cada ejercicio: cuando se pedía en cada uno, el modelo lo olvidaba en los que no eran de test.

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

## Cómo se usa (prototipo)

```bash
npm run generar:ejercicios                  # todos los módulos que aún no tienen ejercicios
npm run generar:ejercicios -- m2-css        # solo ese módulo
npm run generar:ejercicios -- --forzar      # regenera: borra los borradores (nunca los aprobados)
```

1. Necesita las plantillas en la BBDD (`npm run db:seed`) y la IA configurada en `.env.local` (`AI_BASE_URL`, `AI_API_KEY` y `AI_MODEL_GENERADOR`). En modo simulado no genera nada.
2. **Revisión:** `npm run db:studio` → tabla `ejercicio`. En el prototipo el profesor somos nosotros: se lee cada borrador, se corrige o se borra si hace falta, y se cambia `estado` a `aprobado` en los buenos. Hay que comprobar sobre todo que la solución es correcta, que el enunciado no es ambiguo y que el minuto del vídeo es el que explica lo que pregunta.
3. Solo escribe en la BBDD local, salvo `GENERAR_PERMITIR_REMOTO=1`. Cómo generar el banco en Neon: [`docs/bbdd/README.md`](../docs/bbdd/README.md#generar-los-ejercicios).

## Lo que aprendimos al probarlo

- **El modelo olvidaba `conceptoId`** en los ejercicios que no eran de test, y se descartaban. Los ejemplos salen de la BBDD (`jsonb`) con las claves reordenadas y el modelo copia la forma de lo que ve. Por eso la respuesta va **agrupada por concepto** y los ejemplos se le dan con las claves siempre en el mismo orden.
- **Copia lo que ve en el prompt:** con un ejercicio de respuesta corta en el formato de la respuesta, lo usaba aunque el módulo no lo permitiera. El formato no muestra tipos concretos.
- **La revisión humana hace falta de verdad:** en las pruebas salieron ejercicios con la solución equivocada (un selector con la especificidad mal calculada), enunciados ambiguos y minutos que no correspondían. Las reglas del prompt los reducen, pero no los evitan.
- Coste de las pruebas: unos 0,09 € para unas 10 ejecuciones. Generar un módulo cuesta menos de un céntimo.

## En producción

- **Revisión desde la app:** el profesor no usaría herramientas de la BBDD. Revisaría los borradores desde **una pantalla de la app**, solo de los cursos que enseña (`requerirProfesorDelCurso()`), con cada ejercicio legible (concepto, vídeo y minuto con enlace, solución o rúbrica) y los botones aprobar, corregir y descartar. Por debajo cambia la misma columna `estado`.
- **Pedir otros nuevos:** un botón «Generar otros» en esa pantalla, para regenerar los borradores del módulo (lo que hoy hace `--forzar`) o **solo uno**, con un ejercicio nuevo del mismo concepto. El profesor puede decir por qué no le gusta («demasiado fácil», «la solución es ambigua»): ese comentario y los ejercicios ya aprobados se añaden al prompt, para que la IA no los repita y ajuste el nivel. Si los fallos se repiten, lo mejor es mejorar la plantilla (ejemplos e indicaciones) desde la misma pantalla. Con un límite diario por profesor, como el del tutor para los alumnos.
- **En segundo plano:** el generador se lanzaría solo al guardar la plantilla o subir vídeos nuevos al módulo, nunca mientras alguien espera una página.
- **Temario desde la BBDD:** hoy el temario sale de `data/transcripciones/`, como en el material. Cuando la tabla `documento` tenga las transcripciones, se leerá de ahí sin cambiar el resto del generador.

## Instrucciones (prompt de sistema)

Variables: `{{modulo}}`, `{{conceptos}}`, `{{tipos}}`, `{{ejemplos}}`, `{{indicaciones}}`, `{{total}}` y `{{temario}}`.

```prompt
Eres un profesor que prepara los ejercicios de verificación del módulo «{{modulo}}». Sirven para comprobar que el alumno ha entendido los vídeos del módulo, y los resuelve desde el móvil.

Conceptos del módulo (su identificador va en "conceptoId"):
{{conceptos}}

Tipos de ejercicio que quiere el profesor: {{tipos}}. Usa SOLO estos tipos, aunque más abajo aparezcan otros en las reglas o en el formato de la respuesta.

Ejemplos del profesor. Copia su estilo, su nivel y su formato, pero NO los copies ni los cambies un poco: pregunta otras cosas del temario.
{{ejemplos}}

Indicaciones del profesor:
{{indicaciones}}

Genera {{total}} ejercicios: 3 por cada concepto, repartidos entre los tipos permitidos. Cada ejercicio comprueba UNA idea concreta que se explica en el TEMARIO de abajo, y cada uno una idea DISTINTA: no preguntes lo mismo con otro tipo de ejercicio. Usa SOLO la información del temario: no preguntes nada que no se explique en él.

Agrupa los ejercicios por concepto: un grupo por cada concepto de la lista, con su "conceptoId" y sus 3 ejercicios. TODOS los ejercicios llevan "tipo", "enunciado" y "fuente", sea cual sea su tipo. Además, cada tipo lleva sus propios campos:
- "test": "opciones" con 3 o 4 respuestas distintas y una sola correcta; "solucion" es el número de la correcta, empezando en 0. Las incorrectas deben ser errores creíbles.
- "respuesta_corta": "solucion" es una sola palabra, número o valor (por ejemplo: margin, 48px, addEventListener), sin código alrededor, sin punto y coma y sin nombres de variables. El enunciado dice exactamente qué hay que escribir y tiene una única respuesta posible.
- "abierta": "rubrica" dice qué tiene que explicar el alumno y cuándo la respuesta es completa, parcial o incorrecta.
- "codigo": pide un código corto que quepa en el móvil. "rubrica" dice qué tiene que tener el código; "solucion" es un código de referencia.

En cada ejercicio, indica en "fuente" el vídeo y el segundo donde se explica JUSTO lo que pregunta, usando las marcas [vídeo @segundo] del temario. Es el momento al que se enviará al alumno si falla: no pongas el principio del vídeo ni el segundo de otro ejercicio si la idea se explica en otro momento. No inventes fuentes.

Antes de responder, revisa cada ejercicio: la solución tiene que ser correcta según el temario, el enunciado tiene que ser coherente con ella (si pides un formato, la solución lo cumple) y en los de test solo una opción puede ser correcta.

Responde SOLO con un objeto JSON, sin texto antes ni después:
{"conceptos": [{"conceptoId": "...", "ejercicios": [{"tipo": "...", "enunciado": "...", "fuente": {"videoId": "v04", "segundo": 94}, ...y los campos de su tipo...}]}]}

TEMARIO
{{temario}}
```
