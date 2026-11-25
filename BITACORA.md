# Bitácora — Equipo A

Responsable de la bitácora: Antonio Pascual.

---

## Sesión 1 — Lunes 23/11/2026 (10:00–14:00, Aula Magna)

### Qué hicimos

- **Hoja de acuerdos** (en papel): presentaciones, puntos fuertes y funciones. Juan se encarga del repositorio, Antonio de la bitácora y Héctor del contacto con el cliente. Acordamos comunicarnos por WhatsApp y tener el repositorio en GitHub. Los cuatro podemos trabajar en la semana intermedia.
- **Diagnóstico inicial:** a 480 Academy le falta seguimiento del alumno, herramientas que acerquen al alumno y al tutor, y un aprendizaje menos estático.
- **Ronda de preguntas al cliente (11:10):** preguntamos si quieren que los alumnos vean los vídeos enteros o que interioricen los conceptos, se aprenda como se aprenda.
  - Respuesta del cliente: _pendiente de completar_
- **Bocetos en papel:** flujo del alumno en el móvil (Login → Home → Curso → Módulo → Foro → Tarea) y diagrama de arquitectura (Cliente ↔ Caché ↔ API/Servidor ↔ BBDD + IA). Fotos: [flujo](docs/img/flujo.png) y [arquitectura](docs/img/arquitectura.png). Son la versión inicial y pueden cambiar.
- **Diseño de la solución:**
  - Un tutor de IA por módulo, limitado a su temario, que resuelve dudas y genera resúmenes, tarjetas de estudio e infografías.
  - Ejercicios de verificación por módulo, generados por IA a partir de ejemplos del profesor, del tipo que el profesor decida.
  - Módulos no lineales, con una ruta sugerida y un diagnóstico rápido.
  - Idea original: el **Radar del tutor**.
- **Paquete de diseño en el repositorio:** `SPEC.md`, `docs/decisiones.md`, `CONTRIBUTING.md` y el backlog en GitHub Issues, redactados con ayuda de Claude Code (Claude Opus 5.5) a partir de nuestros bocetos y decisiones.
- **Presentación del diseño al cliente (13:10):** _pendiente de completar_

### Decisiones tomadas

| Decisión | Motivo |
|---|---|
| Curso de muestra: Introducción al desarrollo web (4 módulos, 12 vídeos) | Hay mucho contenido en español con subtítulos, y los ejercicios prácticos lucen en la demo |
| Next.js + SQLite como PWA, con Tailwind y shadcn/ui | Un solo proyecto y un solo lenguaje para 4 personas en 4 horas. Los componentes ya hechos compensan la poca experiencia en frontend |
| Modelos de pesos abiertos alojados en la UE (OVHcloud o Scaleway) | Valoramos IAs gratuitas o chinas por coste, pero las descartamos por el RGPD: hay menores y los datos saldrían de la UE. Un modelo abierto alojado en Europa da el mismo precio bajo sin ese riesgo |
| Ejercicios generados por IA a partir de ejemplos del profesor | Así la IA no se desvía, y cada curso evalúa a su manera (no es lo mismo una oposición que desarrollo web) |
| Los módulos no son obligatoriamente secuenciales | El alumno decide su orden. La personalización llega por sugerencia, no por bloqueo |
| El foro queda fuera del alcance del 30/11 | No resuelve ninguno de los cuatro problemas mejor que el tutor y el Radar |
| El reparto de tareas queda abierto | Cada persona se asigna los issues que prefiera |

### Problemas y cómo los resolvimos

- La primera idea («un chatbot») chocaba con la petición del cliente de ir más allá. Lo resolvimos con un tutor por módulo, anclado al temario y capaz de generar material de estudio, junto con los ejercicios de verificación.
- La primera documentación que preparamos no incluía las instrucciones de backlog, CONTRIBUTING y bitácora. Las incorporamos en cuanto las vimos.
- _Otros problemas de la sesión: pendiente de completar_

### Pendiente para la semana intermedia (24–29/11)

- Asignarse los issues del backlog.
- ~~Dar de alta el proveedor de IA y probar los modelos en español.~~ Hecho el 23/11 (ver la entrada siguiente).
- Seleccionar los 12 vídeos y sacar sus transcripciones.
- Escribir los ejemplos del profesor y generar el banco de ejercicios.
- ~~Crear la base común del proyecto (proyecto, contrato de tipos y capa de IA).~~ Hecho el 23/11.
- Preparar los datos simulados para el Radar.

---

## Trabajo de Juan tras la sesión — Lunes 23/11/2026 (tarde)

**Quién:** Juan Carmona, con Claude Code (Claude Opus 5.5) como asistente de programación.
**Bloque:** IA y base técnica (issues #8, #9, #10, #1, #2 y #7).
**Coordinación:** cada PR que tocaba lo compartido se avisó antes por WhatsApp, como dice `CONTRIBUTING.md`.

### Qué hicimos

| Issue | Qué se hizo | PR |
|---|---|---|
| Organización | Backlog de 18 issues con estimación y etiquetas, y tablero en GitHub Projects (Pendiente → En curso → En revisión → Hecho) con un campo **Bloque** para repartir el trabajo. Fotos de los bocetos subidas | #19 |
| Organización | Nueva norma de PRs: cada uno fusiona las suyas y se revisan después, en una revisión conjunta | #20 |
| #8 Base común | Proyecto Next.js 16 + TypeScript + Tailwind + shadcn/ui. **Contrato** de tipos compartidos (`src/lib/types.ts`), `catalog.json` con 4 módulos y 12 vídeos, y 7 endpoints con datos de prueba documentados en `docs/api.md` | #21 |
| #9 Capa de IA | Cliente único de IA compatible con OpenAI y **filtro de privacidad** (quita emails, teléfonos, DNI, IBAN, tarjetas y nombres; seudónimos con HMAC). TypeScript **impide** enviar a la IA texto sin filtrar. Límite diario de consultas y modo simulado sin clave | #22 |
| #10 Proveedor | Alta en **Scaleway Generative APIs**. Modelo elegido: **`gemma-4-26b-a4b-it`** (0,25 € por millón de tokens de entrada y 0,50 € de salida). Coste recalculado: unos **0,08 € por alumno y mes** (unos 100 € al mes para 1.200 alumnos) | #22 |
| #1 Tutor | Tutor por módulo con IA real: responde solo con el temario, cita el vídeo y el minuto, rechaza lo que queda fuera y redirige al módulo correcto, y no da soluciones de ejercicios (solo pistas). Pantalla de chat para móvil. Instrucciones en `agents/tutor.md` | #23 |
| #2 Material | **Común:** resumen y tarjetas generados una vez por módulo; solo los ven los alumnos si una persona los ha revisado. **Personal:** el alumno se crea su material eligiendo concepto, nivel y enfoque; cuenta para su límite diario y lleva la etiqueta «Generado por IA» | #24 |
| #7 Infografías | La IA elige una plantilla (capas, jerarquía, comparativa o pasos) y rellena los datos; nosotros la dibujamos en HTML. Pestaña «Visual» | #25 |

Para desarrollar el tutor se escribieron **transcripciones de prueba del módulo CSS** (v04–v06), marcadas como tales. Hay que sustituirlas por las reales en el #11.

### Decisiones tomadas

| Decisión | Alternativas | Por qué |
|---|---|---|
| Scaleway + `gemma-4-26b-a4b-it` | OVHcloud; APIs gratuitas; APIs chinas | Scaleway documenta que no retiene los datos (RGPD, menores). Gemma superó nuestras pruebas en el Playground: se ciñe al temario, rechaza lo que queda fuera, devuelve JSON válido y corrige con rúbrica |
| Razonamiento del modelo **desactivado** por defecto | Dejarlo activado | Medido con la misma pregunta: 3 s y 303 tokens con razonamiento, frente a 0,5 s y 23 tokens sin él, con una respuesta igual de buena |
| Las instrucciones de cada agente viven en `agents/*.md` y el código las lee de ahí | Instrucciones dentro del código | El documento (entregable) y el comportamiento real no pueden separarse |
| Material común **y** material personal | Solo común | Idea de Juan: el común complementa a los vídeos para todos y el personal se adapta a cada alumno. Lo que piden los alumnos (concepto y tipo, nunca el texto) sirve de señal para el Radar |
| El alumno solo ve material común **revisado** por una persona | Mostrarlo con la etiqueta «pendiente» | Uso responsable de la IA: lo que ven todos lo aprueba una persona. El material personal no se revisa |
| Infografías con **plantillas propias** | Mermaid; imágenes generadas | Ligeras en 4G, nunca salen rotas y se leen bien a 360 px |
| Seudónimos estables (HMAC) en lugar de aleatorios por sesión | Aleatorios | El Radar necesita reconocer al mismo alumno entre sesiones |
| **Decisión de equipo:** demo desplegada en **Vercel** (funciones en París) con **PostgreSQL en la UE**, en lugar de SQLite en un portátil | Portátil con SQLite; portátil con túnel | La wifi del aula puede aislar el móvil del portátil, la PWA necesita HTTPS para instalarse, el cliente podrá probarla desde su teléfono, y SQLite no funciona en Vercel. Plan B: portátil con el punto de acceso del móvil |

### Problemas y cómo los resolvimos

- **Faltaban herramientas en el ordenador** (GitHub CLI y Node.js). Se instalaron con `winget`.
- **GitHub rechazó el primer push** por la privacidad del email. Se configuró en el repositorio el email anónimo de GitHub.
- **PowerShell bloqueaba `npm`** («running scripts is disabled»). Se usa `npm.cmd`, y está explicado en el README.
- **El modelo gastaba todos los tokens razonando** y respondía vacío. Se desactivó el razonamiento (ver decisiones).
- **El modelo rompía a veces el JSON** o copiaba nombres de campos en el texto (`fuera_de_temario: true, ...`). Se reforzaron las instrucciones y el código tolera las respuestas mal formadas. Se probó el modo de esquema estricto y se descartó: en 1 de cada 3 pruebas se quedaba escribiendo espacios.
- **Aviso de Next.js 16** al leer la URL fuera de `<Suspense>`. Se reorganizaron las pantallas como recomienda su documentación.
- **Fallos de diseño en el móvil**: la fuente salía con serifa (desajuste con shadcn/ui) y las tarjetas desbordaban la pantalla. Se corrigieron y se comprobó en el navegador a 375 px.
- **El modelo ordenaba las capas al revés** de lo pedido en las infografías. Se adoptó su orden natural (de fuera a dentro).

### Pendiente

- ~~Fusionar la PR #25 (infografías).~~ Hecho.
- **#11:** vídeos reales y transcripciones. Hoy solo el módulo CSS tiene contenido, y es de prueba.
- Resto del backlog: ejercicios (#3, #4), Radar (#5), diagnóstico (#6), BBDD (#13), pantallas y PWA (#14), presentación (#17).
- ~~Material personal y límite diario se guardan en memoria hasta que exista la BBDD (#13).~~ Hecho: tablas `material_personal` y `uso_ia`.

---

## Trabajo de Héctor — Miércoles 25/11/2026

### Qué hicimos

| Sistema | Qué hace | Issue |
|---|---|---|
| Login | Funcional con la BBDD: email y contraseña cifrada (scrypt), sesión en la tabla `sesion` con cookie httpOnly, registro siempre como alumno y logout. La web es pública; «Tus cursos», módulos, tutor, perfil y pago piden sesión. | #42 |
| Checkout | Funcional con la BBDD: el precio sale del curso, crea el `pedido` y, al pagar con cualquier tarjeta (o PayPal, Bizum, cartera), lo marca como pagado y crea la matrícula. «Tus cursos» muestra cada curso con su porcentaje completado. | #42 |

### Decisiones tomadas

| Decisión | Por qué |
|---|---|
| Para el MVP, login y pago propios y simulados, **sin Better Auth ni Stripe** | No son lo principal de la demo. La firma de `obtenerSesion()` y la función que marca el pedido como pagado se mantienen para conectar Better Auth y el webhook de Stripe más adelante |

---

## Trabajo de Sergio — Martes 24 y miércoles 25/11/2026

**Quién:** Sergio Cid, con Claude Code (Claude Opus 5.5) como asistente de programación.
**Bloque:** Contenido y ejercicios (issues #11, #12, #4, #15 y #3).

### Qué hicimos

| Issue | Qué se hizo | PR |
|---|---|---|
| #11 Contenido | **12 vídeos reales** de dos canales de YouTube (Kiko Palomares para HTML, maquetación y JS; Dorian Desings para CSS) en `catalog.json`, con sus **12 transcripciones** en `data/transcripciones/`. Sustituyen a las 3 de prueba. Script `scripts/transcripciones/descargar.py` que descarga los subtítulos con yt-dlp y los limpia. Nombres de los conceptos ajustados a lo que explican los vídeos (los `id` no cambian). Documentado en el SPEC (apartados 7, 8 y 9), en el README y en decisiones | #32 |
| #13 BBDD (ayuda) | Funciones para pasar las transcripciones al **markdown con marcas `[mm:ss]`** de la tabla `documento` y leerlo de vuelta, para el seed y para el tutor. Test de ida y vuelta con las 12 transcripciones reales: no se pierde ni texto ni tiempos | #33 |
| SPEC | **Alcance del MVP** con lo hablado en el grupo el 25/11: login y pago simulados, diagnóstico inicial al apuntarse (H6, imprescindible), tutor humano (H9), sin panel de administración y recorrido de la demo | #41 |
| #12 Ejemplos del profesor | 2 o 3 ejemplos por módulo, de tipos distintos (test, respuesta corta, abierta y código), con su solución o rúbrica y sacados de los vídeos, en `data/ejemplos-profesor/`. Test que comprueba el formato | #44 |
| #4 (preparación) | **Seed de las plantillas de ejercicios:** `npm run db:seed` carga los ejemplos del profesor en `plantilla_ejercicio`, una por módulo del curso de la demo | #45 |
| #4 Generador de ejercicios | **`npm run generar:ejercicios`**: la IA genera 9 ejercicios por módulo (3 por concepto) a partir de la plantilla del profesor; el código los valida (tipo y formato de la plantilla, concepto y vídeo del módulo, sin repetidos) y los guarda **en borrador**. Una persona los revisa y aprueba con Drizzle Studio. Instrucciones del agente en `agents/generador-ejercicios.md`. Probado con la IA real en la BBDD local: 4 módulos, dos ejecuciones seguidas sin fallos | PR_NUEVA |

### Decisiones tomadas

| Decisión | Alternativas | Por qué |
|---|---|---|
| El módulo de CSS, con los vídeos de **Dorian Desings** | Todo el curso de un solo canal | Sus tres vídeos explican la especificidad (el ejemplo del Radar), el modelo de caja y las unidades, que son los tres conceptos del módulo |
| Transcripciones = **subtítulos de YouTube** limpiados con un script | Whisper en local | Los 12 vídeos ya tenían subtítulos en español. Tarda menos de un minuto y no cuesta nada; Whisper habría tardado horas sin tarjeta gráfica |
| **Decisión de equipo (24/11):** el revisor de transcripciones con IA queda solo documentado (`agents/revisor-transcripciones.md`) | Ejecutarlo ya o corregirlas a mano | El tutor corrige por contexto la mayoría de fallos. En producción sí hace falta (RAG con 400 vídeos), a unos 0,003 € por vídeo |
| **Decisión de equipo (24/11):** los ejemplos del profesor son origen del seed en `data/ejemplos-profesor/`, como `catalog.json` | Escribirlos directamente en la BBDD | No hay panel de administración: el fichero es donde el profesor configura su módulo. Se importa a la BBDD y se borra cuando todo lea de ella |
| Si una plantilla ya existe, el seed la deja **como dice el fichero** | No tocarla | Si el profesor cambia un ejemplo en el fichero, repetir el seed lo aplica |
| Plantillas solo del curso de la demo | Una por cada curso | Los otros 5 cursos son de escaparate, sin clases ni conceptos |
| Ejercicios: se desarrolla en la BBDD local y el banco se genera **una vez en Neon** y se revisa allí | Generar en local y copiarlo a Neon con un script | La IA no da dos veces lo mismo, y los borradores no los ve ningún alumno hasta que se aprueban: así no hay que copiar nada ni programar otra pieza |
| Ejercicios: **9 por módulo** (3 por concepto), y si quedan menos de 6 válidos no se guarda nada | Más o menos | El #3 enseña entre 5 y 8 por intento: queda margen para descartar alguno al revisar |
| Ejercicios: se aprueban con **Drizzle Studio** | Un script de revisión propio | No hay que programarlo y permite también corregir y borrar. En el prototipo revisamos nosotros; en producción, el profesor lo haría desde una pantalla de la app (añadido al SPEC) |
| La IA puede ayudar a revisar, pero **aprueba una persona** | Que apruebe la IA | Si una IA genera y otra aprueba, la revisión humana se queda en el papel |

### Problemas y cómo los resolvimos

- **Los subtítulos fallan en vocabulario técnico** («create Element», «dip» por `div`, la especificidad «0 10»). Lo probamos con el tutor: los fallos evidentes los corrige por contexto, pero no los que cambian el sentido. En el prototipo se acepta; para producción queda diseñado el revisor.
- **El temario real ocupa menos de lo supuesto:** de unos 5.300 tokens (HTML) a unos 13.000 (JS), unos 8.000 de media. El SPEC suponía 12.000; se mantiene como hipótesis conservadora.
- **El generador de ejercicios fallaba en un módulo:** el modelo olvidaba el concepto en los ejercicios que no eran de test y se descartaban. La causa: los ejemplos salen de la BBDD con las claves reordenadas (`jsonb`) y el modelo copia la forma de lo que ve. Ordenar las claves no bastó; se resolvió pidiendo los ejercicios **agrupados por concepto**.
- **El modelo copia lo que ve en el prompt:** usaba un tipo de ejercicio no permitido porque aparecía en el formato de la respuesta, y copiaba los ejemplos del profesor. Se ajustaron las instrucciones. Aun así, en la revisión salieron soluciones equivocadas y enunciados ambiguos: la revisión humana hace falta de verdad.
- Coste de las pruebas del generador: unos 0,09 € de IA para unas 10 ejecuciones.

### Pendiente

- **Neon, en este orden** (quien tenga la `DATABASE_URL`, ver `docs/bbdd/README.md`): el seed para cargar las plantillas, `npm run generar:ejercicios` y revisar y aprobar el banco.
- **#3:** la corrección de las respuestas cortas tiene que ser flexible (mayúsculas, `;` final, `< >`), porque se comparan con la solución.
- **#15:** regenerar el material de CSS, desfasado porque se generó con las transcripciones de prueba.
- **#3:** ejercicios de verificación con corrección.
