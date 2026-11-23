# SPEC — 480 Academy · Equipo A

> Paquete de diseño de la sesión 1 (23/11/2026). Es la base de lo que construiremos el 30/11.

---

## 1. El alumno y su problema

Es un alumno de 480 Academy que estudia desde el móvil (71 % del tráfico), con poco tiempo y un nivel previo muy variable.
Hoy recibe una lista fija de vídeos: se salta los que cree que domina, se pierde en los que no entiende y llega al examen sin saber si ha aprendido.
Paga por un acompañamiento cercano que 6 tutores no pueden dar a 1.200 alumnos.

---

## 2. Flujo del alumno

![Boceto del flujo del alumno](docs/img/flujo.jpg)
<!-- TODO: subir la foto del boceto en papel a docs/img/flujo.jpg -->

| # | Pantalla | Qué hace |
|---|---|---|
| 1 | **Login** | El alumno entra con su usuario. En el prototipo, se elige un alumno de demo. |
| 2 | **Home** | Muestra el avatar, el nombre y los cursos. Para cada módulo, una **ruta sugerida** y su estado: dominado, en curso o pendiente. |
| 3 | **Curso X** | Banner, descripción y lista de módulos. El alumno los recorre en el orden que quiera (no es un itinerario lineal). |
| 4 | **Módulo Y** | Vídeos del módulo, botón al **tutor IA del módulo** y acceso a los **ejercicios de verificación**. |
| 5 | **Tutor del módulo** | Agente limitado al temario del módulo: responde dudas y genera resúmenes, tarjetas de estudio e infografías. |
| 6 | **Tarea / ejercicios** | Ejercicio arriba y respuesta abajo. Tras responder, hay corrección inmediata con un enlace al minuto exacto del vídeo que hay que repasar. |
| 7 | **Foro** | Hilos de dudas entre alumnos. Está en el diseño, pero queda fuera del alcance del 30/11. |
| T | **Radar del tutor** (vista del tutor) | Alumnos atascados, conceptos que fallan y dudas frecuentes por módulo. |

---

## 3. Respuesta a los problemas

| Problema de 480 Academy | Qué hace nuestra solución |
|---|---|
| **Los alumnos se saltan los vídeos** | Cada módulo tiene **ejercicios de verificación** generados a partir del contenido de los vídeos. Para dar el módulo por completado hay que resolverlos. Si el alumno falla, la corrección le lleva al minuto concreto del vídeo donde se explica. Así el vídeo tiene un motivo para verse, aunque nada obliga a verlo entero. |
| **Los itinerarios son iguales para todos** | Los módulos son **no lineales**. Cada módulo tiene un **diagnóstico rápido**: quien demuestra que lo domina lo marca como dominado y pasa a otro. La Home ordena una ruta sugerida según los resultados del alumno, sin bloquear nada. El tutor IA adapta el nivel de sus explicaciones. |
| **No sabemos si el alumno aprende** | Los resultados de los ejercicios por módulo y por concepto son la **métrica intermedia** que falta entre el play y el examen final. Cada intento se registra como evento de aprendizaje. |
| **El acompañamiento no llega a todos** | Un **tutor IA por módulo**, disponible 24/7 y limitado a su temario, resuelve las dudas frecuentes. El **Radar del tutor** (idea original) señala a los 6 tutores humanos dónde hacen falta de verdad. |

---

## 4. Historias de usuario

| # | Como... | Quiero... | Para... | Prioridad | Criterios de aceptación |
|---|---|---|---|---|---|
| H1 | alumno | preguntar dudas al tutor del módulo | resolverlas sin esperar a un tutor humano | **Imprescindible** | Responde en español, en menos de 5 s en 4G. Solo usa el temario del módulo. Ante una pregunta fuera del temario, lo dice y no inventa. Cita el vídeo y el minuto de donde sale la respuesta. |
| H2 | alumno | pedir al tutor un resumen o tarjetas de estudio del módulo | repasar rápido desde el móvil | **Imprescindible** | El resumen cabe en una pantalla de móvil. Las tarjetas se muestran como pregunta y respuesta con un toque para girarlas. El material se genera una vez por módulo y se reutiliza (caché). |
| H3 | alumno | resolver los ejercicios de verificación de un módulo | comprobar que he aprendido y completar el módulo | **Imprescindible** | Se presentan entre 5 y 8 ejercicios del banco del módulo. Las respuestas abiertas se corrigen con una rúbrica. El feedback incluye un enlace al vídeo y minuto que hay que repasar. El progreso se guarda. |
| H4 | profesor | dar ejemplos y el tipo de ejercicio de cada módulo | que la IA genere ejercicios que no se desvíen de lo que quiero evaluar | **Imprescindible** | Se configura en un fichero (sin panel de administración). Los ejercicios generados respetan el tipo y el formato de los ejemplos. El profesor puede revisarlos antes de publicarlos. |
| H5 | tutor | ver qué alumnos están atascados y en qué conceptos | dedicar mi tiempo a quien lo necesita | **Imprescindible** | El Radar lista los alumnos con fallos repetidos o inactividad, los conceptos más fallados por módulo y un resumen de las dudas frecuentes hechas al tutor IA. |
| H6 | alumno con experiencia | hacer un diagnóstico rápido de un módulo | no tener que ver contenido que ya domino | **Deseable** | Unas 3 preguntas. Si las acierta, el módulo queda como dominado y baja en la ruta sugerida. |
| H7 | alumno | pedir una infografía de un concepto | entenderlo de un vistazo | **Deseable** | Se genera como diagrama (Mermaid o HTML), no como imagen. Es legible en una pantalla de 360 px. |
| H8 | alumno | comentar dudas con otros alumnos en un foro | aprender con los compañeros | **Fuera** | Fuera del alcance del prototipo. |

---

## 5. Arquitectura

![Diagrama de arquitectura en papel](docs/img/arquitectura.jpg)
<!-- TODO: subir la foto del diagrama a docs/img/arquitectura.jpg -->

```
 Alumno / Tutor (móvil)
        │  HTTPS
        ▼
 ┌──────────────────────┐
 │ Cliente PWA (Next.js)│  service worker: caché de la app y del material generado
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ Capa de caché        │  CDN para estáticos + caché de resúmenes, tarjetas e infografías por módulo
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐      ┌───────────────────────────┐
 │ API (Next.js routes) │─────►│ Filtro de privacidad      │──► Modelo abierto alojado en la UE
 │  · catálogo          │      │ (seudonimiza y quita PII) │    (API compatible OpenAI)
 │  · progreso          │      └───────────────────────────┘
 │  · agentes           │
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │ BBDD (SQLite)        │  alumnos, progreso, intentos, conversaciones
 └──────────────────────┘
   catalog.json + transcripciones + ejemplos del profesor (ficheros de configuración)
```

| Pieza | Qué hace |
|---|---|
| **Cliente PWA** | Next.js con Tailwind CSS y componentes de shadcn/ui, con diseño mobile-first, usable con una mano (acciones principales en la zona inferior). Es instalable y cachea la interfaz para cargar rápido en 4G. Los vídeos son *embeds* de YouTube y no se alojan aquí. |
| **Capa de caché** | Sirve los estáticos y el material de estudio ya generado. Un resumen o un juego de tarjetas se genera **una vez por módulo** y lo comparten todos los alumnos. |
| **API** | Rutas de Next.js. Gestiona el catálogo, el progreso y los ejercicios, y orquesta los agentes. Está diseñada como API REST documentada para facilitar la integración futura con la plataforma de 480 Academy. |
| **Filtro de privacidad** | Es código, no IA. Antes de cualquier llamada a la IA sustituye la identidad del alumno por un seudónimo y elimina datos personales del texto libre (emails, teléfonos, DNI, nombres conocidos). |
| **IA** | Modelo de pesos abiertos alojado por un proveedor europeo. Los datos no salen de la UE. Se accede a través de una capa propia que permite cambiar de proveedor sin tocar el resto. |
| **BBDD** | SQLite en el prototipo, con migración directa a PostgreSQL en producción. |
| **Ficheros de configuración** | `catalog.json` (curso, módulos y vídeos), las transcripciones y los ejemplos de ejercicios del profesor. No hay panel de administración. |

**Integración futura:** la plataforma actual no tiene API. Por eso el prototipo es independiente, pero cada interacción relevante (vídeo visto, ejercicio resuelto, duda planteada) se guarda como un evento con forma **xAPI**, el estándar de registros de aprendizaje. Así se podrá volcar a un LRS o a la plataforma cuando exista una vía de integración.

---

## 6. Modelo de datos y flujo hacia la IA

### Entidades principales

| Entidad | Campos clave |
|---|---|
| `Alumno` | id, nombre, email, es_menor, consentimiento_tutor_legal |
| `Curso` / `Modulo` / `Video` | id, título, orden sugerido, url YouTube, transcripción, conceptos |
| `PlantillaEjercicio` | módulo, tipo, ejemplos del profesor, rúbrica |
| `Ejercicio` | módulo, concepto, enunciado, solución o rúbrica, vídeo y minuto de referencia, estado (borrador / aprobado) |
| `Intento` | alumno, ejercicio, respuesta, puntuación, feedback, fecha |
| `Progreso` | alumno, módulo, estado (pendiente / en curso / dominado / completado), aciertos por concepto |
| `Conversacion` / `Mensaje` | alumno (seudónimo), módulo, texto, fecha. Caducan a los 90 días |
| `MaterialGenerado` | módulo, tipo (resumen / tarjetas / infografía), contenido. Se comparte entre alumnos |

### Qué sale hacia la IA y qué no

| Sale hacia la IA | **No** sale nunca |
|---|---|
| Transcripciones y conceptos del módulo | Nombre, email, edad o cualquier identificador real |
| Ejemplos y rúbricas del profesor | Que el alumno es menor de edad |
| Pregunta o respuesta del alumno, **filtrada** | Historial fuera del módulo actual |
| Un seudónimo aleatorio por sesión (p. ej. `alumno_7f3a`) | Datos de otros alumnos |
| Para el Radar: estadísticas agregadas y dudas seudonimizadas | |

### Cómo cumplimos el RGPD (y la condición sobre menores)

1. **Datos en la UE:** el modelo está alojado por un proveedor europeo, con contrato de encargado del tratamiento y **sin retención ni entrenamiento** con nuestros datos. Se descartan las APIs alojadas fuera de la UE y los planes gratuitos que usan los datos para entrenar.
2. **Minimización:** la IA nunca necesita saber quién es el alumno. La relación entre el seudónimo y el alumno solo vive en nuestra BBDD.
3. **Filtro de PII:** el texto libre se limpia antes de enviarse, porque un alumno puede escribir su teléfono en una duda.
4. **Menores:** se exige el consentimiento del tutor legal para menores de 14 años (art. 7 LOPDGDD). Se aplican las mismas reglas a todos los alumnos, sin un trato especial que requiera enviar la edad.
5. **Retención limitada:** las conversaciones se borran a los 90 días y el progreso se conserva mientras dure la matrícula.
6. **Transparencia:** el alumno sabe que habla con una IA y puede pedir un tutor humano.

---

## 7. Agentes de IA

Las instrucciones completas de cada agente estarán en `agents/` (Markdown).

| Agente | Qué hace | Modelo y por qué | Entrada | Salida | Límites |
|---|---|---|---|---|---|
| **Tutor del módulo** | Responde dudas y genera resúmenes, tarjetas de estudio e infografías del módulo | Modelo abierto mediano (familia Qwen o similar) alojado en la UE. Es barato, rápido y funciona bien en español, que es lo que pide una interacción frecuente | Temario del módulo (transcripciones y conceptos), pregunta filtrada, últimos mensajes | Texto, o JSON estructurado (tarjetas, diagrama Mermaid) | **Solo** su temario: fuera de él responde «eso no está en este módulo». Cita la fuente (vídeo y minuto). No hace ejercicios por el alumno. Limita los mensajes diarios por alumno |
| **Generador de ejercicios** | Crea el banco de ejercicios de cada módulo a partir de los ejemplos del profesor | Modelo abierto más grande, también en la UE. Se ejecuta **una vez por módulo** (no por alumno), así que su coste es despreciable y compensa la calidad | Transcripciones, conceptos, ejemplos y tipo de ejercicio del profesor | JSON de ejercicios en estado *borrador*, con solución o rúbrica y vídeo y minuto de referencia | Mismo tipo y formato que los ejemplos. Solo contenido del módulo. **El profesor aprueba** antes de publicar. Ningún dato de alumnos |
| **Corrector** | Evalúa respuestas abiertas con la rúbrica y explica el error | Modelo mediano. Las preguntas tipo test se corrigen con código, sin IA | Enunciado, rúbrica, respuesta filtrada | Puntuación, feedback breve, vídeo y minuto que hay que repasar | Se ciñe a la rúbrica. Si no tiene confianza, lo marca para revisión humana |
| **Analista del Radar** | Resume para el tutor qué está fallando y qué dudas se repiten | Modelo mediano, en lote nocturno (no en tiempo real) | Estadísticas calculadas por código y dudas seudonimizadas | Resumen por módulo y lista priorizada de seudónimos (se reidentifican en nuestro servidor) | No diagnostica ni juzga al alumno: señala patrones. La decisión es siempre del tutor humano |

---

## 8. Contenido

**Curso elegido:** *Introducción al desarrollo web* (HTML, CSS y JavaScript). Tiene mucho contenido en español en YouTube y unos ejercicios prácticos que lucen en la demo.

| Módulo | Vídeos (12) |
|---|---|
| M1 · HTML | 1. Qué es la web y cómo funciona · 2. Estructura de un documento HTML · 3. Etiquetas semánticas y formularios |
| M2 · CSS | 4. Selectores y especificidad · 5. Modelo de caja · 6. Colores, tipografía y unidades |
| M3 · Maquetación responsive | 7. Flexbox · 8. CSS Grid · 9. Media queries y mobile-first |
| M4 · JavaScript | 10. Variables, tipos y funciones · 11. El DOM · 12. Eventos |

<!-- TODO: completar con las URLs concretas de YouTube al seleccionar los vídeos -->

**De dónde salen los textos y las transcripciones:**
- Se eligen vídeos con **subtítulos en español** y se descargan en formato VTT, con marcas de tiempo. Gracias a esas marcas, el tutor y el corrector pueden citar el minuto exacto.
- Si un vídeo no tiene subtítulos, se transcribe con **Whisper** (modelo abierto) ejecutado en local, sin enviar el audio a terceros. Es la misma vía para el 70 % del catálogo real que no tiene transcripción, y es un coste único por vídeo.
- Los conceptos de cada módulo se extraen de las transcripciones con el generador y los revisa el equipo.

---

## 9. Coste

**Hipótesis por alumno activo y mes:**
- 20 consultas al tutor. Cada una envía el temario completo del módulo (unos 12.000 tokens) más el historial (unos 2.000) y recibe unos 500 tokens.
- 10 respuestas abiertas corregidas por IA (unos 3.000 tokens de entrada cada una).
- Resúmenes, tarjetas, infografías y banco de ejercicios: se generan **una vez por módulo** y se comparten, así que su coste por alumno es casi nulo.
- Precio orientativo de un modelo abierto mediano alojado en la UE: unos 0,5 € por millón de tokens de entrada y 1,5 € por millón de salida. *Hay que confirmarlo con el proveedor elegido.*

| Concepto | Tokens/mes | Coste |
|---|---|---|
| Tutor (entrada) | ~280.000 | ~0,14 € |
| Tutor (salida) | ~10.000 | ~0,015 € |
| Corrector | ~30.000 entrada + ~3.000 salida | ~0,02 € |
| **Total por alumno medio** | | **≈ 0,18 €/mes** |
| Alumno muy activo (×3) | | ≈ 0,55 €/mes |
| **1.200 alumnos** | | **≈ 215 €/mes** (escenario conservador) |

**Cómo lo reduciríamos:**
1. **Recuperación por fragmentos (RAG):** enviar solo los trozos de transcripción relevantes y no el módulo entero. La entrada baja un 70–80 %, hasta unos **0,05 €/alumno/mes**.
2. **Caché de material y de preguntas frecuentes:** las preguntas repetidas se responden desde la caché, sin llamar al modelo.
3. **Tipo test corregido por código:** solo las respuestas abiertas pasan por la IA.
4. **Límite diario de consultas** por alumno, que da un coste máximo predecible.
5. **Prompt caching** si el proveedor lo ofrece, porque el temario del módulo es un prefijo fijo.

---

## 10. Idea original: Radar del tutor

**Qué es:** un panel para los 6 tutores que cada mañana les dice **a quién atender y por qué**. Cruza los resultados de los ejercicios y las dudas hechas al tutor IA. Muestra:
- alumnos con fallos repetidos en un mismo concepto o con días sin actividad,
- los conceptos que más se fallan en cada módulo,
- un resumen de las dudas frecuentes, con la respuesta que dio el tutor IA para que el humano la valide o la corrija.

**Por qué mejora la experiencia:**
- **Para el tutor:** 1.200 alumnos entre 6 tutores es imposible de seguir uno a uno. El Radar convierte ese volumen en una lista corta y priorizada, y el tutor dedica su tiempo a quien lo necesita.
- **Para el alumno:** recibe la atención cercana que paga justo cuando se atasca, no cuando ya ha abandonado.
- **Para 480 Academy:** si un concepto lo falla todo el mundo, el problema está en el vídeo y no en el alumno. Es información para mejorar el catálogo.

---

## 11. Alcance para el 30/11

| Entra | Por qué |
|---|---|
| PWA mobile-first con Home, Curso y Módulo, y ruta sugerida | Es el recorrido de la demo, que se hará desde el teléfono |
| Catálogo de 4 módulos y 12 vídeos en `catalog.json` | Condición del reto: el catálogo se da por cargado |
| Tutor del módulo: dudas, resumen y tarjetas | Es el núcleo de la propuesta de IA |
| Ejercicios de verificación pregenerados, con corrección y enlace al minuto | Responde a «se saltan vídeos» y a «no sabemos si aprende» |
| Radar del tutor básico | Es nuestra idea original |
| Filtro de privacidad y seudonimización | Es una condición del cliente y un criterio de evaluación |
| Instrucciones de los agentes en `agents/` | Es un entregable |

| Queda fuera | Por qué |
|---|---|
| Login real y gestión de usuarios | Se usan alumnos de demo y no aporta a la demo |
| Foro | No resuelve ninguno de los cuatro problemas mejor que el tutor y el Radar |
| Notificaciones push y repaso espaciado | Encaja como evolución, pero no cabe en 4 horas |
| Integración con la plataforma actual | Sin API. Lo dejamos preparado con eventos xAPI |
| RAG | Con 12 vídeos cabe el temario entero en el contexto. Sí entra en producción por coste |
| Diagnóstico rápido e infografías | Deseables: entran solo si sobra tiempo |

### Preparación imprescindible antes del 30/11

| Tarea | Por qué |
|---|---|
| **Datos simulados para el Radar:** unos 30 alumnos ficticios con intentos, fallos y dudas que formen patrones realistas (p. ej. «el 60 % falla especificidad en CSS») | Con 4 alumnos de demo el Radar sale vacío y la idea original no se aprecia |
| **Material pregenerado:** resúmenes, tarjetas y banco de ejercicios de los 4 módulos, generados y guardados antes de la demo | La demo no depende de que la IA responda en directo. En directo solo van el chat del tutor y la corrección |
| **Alta en el proveedor de IA** (OVHcloud o Scaleway), comprobar qué modelos ofrece y su calidad en español | El alta puede pedir verificación y pago. Si falla, aún hay margen para cambiar de proveedor |
| **Ejemplos del profesor:** 2 o 3 ejercicios de ejemplo por módulo, de tipos distintos (test, respuesta corta, código) | El generador de ejercicios parte de ellos. En el prototipo hacemos de profesor nosotros |
| **Tailwind CSS + shadcn/ui** como base visual | Nadie del equipo tiene el frontend como punto fuerte. Los componentes ya hechos aseguran que se vea bien en el móvil |

### Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El proveedor de IA tarda o falla durante la demo | Material pregenerado y respuestas de reserva para las preguntas del guion de la demo |
| Respuestas pobres del modelo abierto en español | Probarlo esta semana. La capa propia permite cambiar de modelo o de proveedor con un cambio de configuración |
| Poca experiencia en frontend | Componentes ya hechos y un responsable de la base visual y la navegación |
| Las tareas paralelas chocan el 30/11 | El contrato (tipos compartidos, formato de `catalog.json` y de los ejercicios) queda cerrado antes de la sesión |

### Preguntas abiertas al cliente

1. ¿Queréis que el **examen final** se desbloquee cuando el alumno haya verificado todos los módulos? Los módulos siguen siendo libres entre sí.
2. ¿Os importa que vean los **vídeos enteros**, o que interioricen los conceptos, los vean o no? Si importa el visionado, podemos medir qué parte de cada vídeo se ve con la API del reproductor de YouTube, como otra métrica intermedia.
