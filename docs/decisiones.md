# Decisiones — Equipo A

## 1. Stack tecnológico

**Decisión:** Next.js (TypeScript) como PWA, con Tailwind CSS y shadcn/ui para la interfaz y la API en las propias rutas de Next.js. Se despliega en **Vercel**, con las funciones en París, y usa **PostgreSQL alojado en la UE**.
**Alternativas:** React con un backend separado en FastAPI (Python), o una app nativa. Para la base de datos y la demo, empezamos con SQLite en un portátil.
**Por qué:** con un solo proyecto y un solo lenguaje, los cuatro miembros del equipo podemos trabajar en paralelo y construir el prototipo en las 4 horas de la segunda sesión. Una PWA cumple el requisito móvil sin app nativa: se puede instalar, cachea la interfaz y carga rápido en 4G. Cambiamos SQLite en el portátil por Vercel con PostgreSQL por la demo: la wifi del aula puede impedir que el móvil llegue al portátil, la PWA necesita HTTPS para instalarse, y con una URL fija el cliente puede probarla desde su teléfono. SQLite no sirve en Vercel porque sus servidores no guardan ficheros de forma permanente. Además, PostgreSQL es lo que usaríamos en producción. Todo queda en la UE (Vercel en París, base de datos en la UE y Scaleway en París).

## 2. Datos, inicio de sesión, ficheros y pagos

**Decisión:** la **BBDD manda**: PostgreSQL en **Neon** (UE) con **Drizzle** guarda todo, también el catálogo y las transcripciones en markdown, que dejan de ser ficheros. Inicio de sesión con **Better Auth** (email y contraseña o Google), imágenes en **Cloudflare R2** (UE) y compra simulada con **Stripe en modo test**. Detalle en [`docs/bbdd/README.md`](bbdd/README.md).
**Alternativas:** Prisma o TypeORM como ORM; mantener el catálogo y el material en ficheros JSON; guardar el progreso como un JSON por alumno; una simulación de pago hecha a mano.
**Por qué:** una sola fuente de verdad evita que los ficheros y la BBDD digan cosas distintas, y Vercel no permite que la app escriba ficheros. Drizzle define el esquema en TypeScript sin un paso de generación y escribe con naturalidad las consultas de agregación del Radar; TypeORM depende de clases y decoradores que no encajan con nuestro contrato de interfaces. Las tablas separadas (y no un JSON por alumno) permiten las consultas del Radar y evitan que dos escrituras a la vez se pisen. Stripe en modo test valida la transacción como en producción sin mover dinero. Todo queda en la UE.

## 3. Modelo y proveedor de IA

**Decisión:** modelos de pesos abiertos alojados por un proveedor europeo, detrás de una capa propia con API compatible con OpenAI. Elegimos **Scaleway Generative APIs**, que documenta que no retiene los datos, y el modelo **`gemma-4-26b-a4b-it`** (0,25 € por millón de tokens de entrada y 0,50 € por millón de salida) para todos los agentes. Si la generación de ejercicios se queda corta, se cambia solo ese modelo por uno mayor.
**Alternativas:** las APIs de los fabricantes chinos (DeepSeek, Alibaba), los modelos comerciales de EE. UU. (OpenAI, Anthropic, Google), Mistral o los planes gratuitos.
**Por qué:** hay alumnos menores y se aplica el RGPD. Las APIs chinas implican una transferencia de datos fuera de la UE sin garantías (en Italia ya se bloqueó DeepSeek), y los planes gratuitos usan los datos para entrenar. Con un modelo abierto alojado en la UE se consigue el precio bajo de esos modelos sin que los datos salgan de Europa. La capa propia permite cambiar de proveedor si cambian los precios o la calidad.

## 4. Vídeos y transcripciones del prototipo

**Decisión:** 12 vídeos de YouTube de dos canales en español (Kiko Palomares para HTML, maquetación y JavaScript; Dorian Desings para CSS) con sus **subtítulos de YouTube**, descargados con yt-dlp y limpiados con un script propio. El **revisor de transcripciones** (un agente de IA que corrige el vocabulario técnico) queda diseñado y documentado para producción, pero **no se ejecuta en el prototipo**.
**Alternativas:** todos los vídeos de un solo canal; transcribir con Whisper en local; ejecutar ya el revisor (unos 3 céntimos) o corregir las transcripciones a mano.
**Por qué:** con un solo canal, el módulo de CSS no explicaba bien la especificidad, que es el ejemplo del Radar; con Dorian Desings, sus tres vídeos encajan con los tres conceptos del módulo. Los 12 vídeos ya tenían subtítulos en español, así que Whisper (horas en un portátil sin GPU) no aportaba nada. El tutor recibe el módulo entero y corrige por contexto la mayoría de los fallos de los subtítulos, así que en el prototipo no compensa ni el gasto ni el tiempo del revisor. En producción sí hace falta, porque con 400 vídeos se buscan fragmentos (RAG) y una búsqueda no encuentra «div» si la transcripción dice «dip». Corregirlas a mano no se puede repetir con 400 vídeos.

## 5. Decisión de producto que más condiciona la solución

**Decisión:** la IA trabaja **dentro de cada módulo y anclada a su contenido**: un tutor por módulo, limitado a su temario, y ejercicios generados a partir de los ejemplos del profesor. No hay un asistente general.
**Alternativas:** un chatbot general para todo el curso, o ejercicios escritos a mano sin IA.
**Por qué:** si el tutor solo conoce su temario, no se inventa respuestas y cita el vídeo y el minuto, y así lleva al alumno de vuelta al contenido. Que los ejercicios partan de ejemplos del profesor evita que la IA se desvíe y respeta que cada curso evalúa de forma distinta (no es lo mismo una oposición que desarrollo web). Además, el material generado por módulo se comparte entre alumnos, y eso mantiene el coste bajo.

## 6. Alcance del MVP (25/11)

**Decisión:** en el MVP, el **inicio de sesión y el pago se simulan** (se entra como un usuario de demo y se paga con un botón de prueba). Better Auth y Stripe quedan diseñados para producción y aislados para cambiarlos sin tocar el resto. **No hay panel de administración**. Entran el **diagnóstico inicial**, que reordena la ruta, y el botón para **pasar una duda a un tutor humano**, que el profesor responde desde el Radar.
**Alternativas:** construir ya el login con Better Auth y el pago con Stripe en modo test; un panel para que el profesor cree cursos con enlaces de YouTube.
**Por qué:** el login y la pasarela de pago no responden a ningún problema del alumno y consumen horas que hacen falta en el tutor, los ejercicios, el diagnóstico y el Radar. El cliente descarta expresamente el panel de administración («Tampoco queremos un panel de administración para cargar contenido»). El diagnóstico responde a «los itinerarios son iguales para todos», y el tutor humano a «prometemos un acompañamiento que no damos». Detalle en `SPEC.md`, apartados 2, 5 y 11.

## 7. IA del foro: excepción al RGPD solo para el MVP (26/11)

**Decisión:** el foro (H10) usa un **modelo de decisión** separado del tutor, **Perplexity Decider V1.3 (gratis) por OpenRouter**, que solo decide si un comentario responde a la duda y si es correcto, aproximado o incorrecto. Ese modelo **no se procesa en la UE**, así que es una **excepción a la decisión 3, solo para el MVP**.
**Alternativas:** Gemma en Scaleway con otra clave (se queda en la UE, pero es un chat al que hay que obligar a contestar solo con la decisión); Jev de TypeSafe (de pago y también fuera de la UE); Gemini o Mistral gratis.
**Por qué se acepta en el MVP**, con estas tres salvaguardas:
1. **No se envían datos de alumnos:** solo el texto de la duda y del comentario, filtrado (sin nombres, emails, teléfonos ni DNI). Nunca quién lo escribió, ni su edad, ni ningún otro dato del alumno.
2. **No escribe nada:** es un modelo de decisión que solo elige entre cuatro opciones. Las respuestas de Sensei las pone el código, y si duda (confianza baja) no decide y lo deja para el profesor.
3. **Se puede cambiar sin tocar código:** va detrás de sus propias variables (`AI_FORO_*`), separado del tutor.

**En un caso real** se traería a la UE con un **modelo de código abierto** alojado en Europa: según su anuncio, los pesos de Decider son abiertos (Apache 2.0) y se podrían alojar aquí (está por confirmar); si no, bastaría con Gemma en Scaleway, como el resto de agentes.

## 8. Caché: por capas en el MVP y Upstash en producción (27/11)

**Decisión:** en el MVP **no se monta un servidor de caché** (proxy ni Redis). La caché se reparte en capas que ya funcionan, y la capa compartida entre servidores, **Upstash (Redis)**, queda documentada para producción sin implementarla:

| Capa | Qué guarda | En el MVP | En producción |
|---|---|---|---|
| 1. Navegador | La interfaz: JS, CSS, fuentes e imágenes | Service worker de la PWA (`public/sw.js`) | Igual |
| 2. CDN (Vercel) | La estructura estática de cada página | Prerender parcial: la estructura sale de la CDN y solo los datos van al servidor | Igual |
| 3. Memoria del servidor | Respuestas caras de repetir | El resumen de dudas del Radar se guarda una hora por curso y solo se recalcula si hay preguntas nuevas (`src/server/radar/servicio.ts`) | **Upstash (Redis)**, compartido entre instancias |
| 4. BBDD | El material generado por IA | Se genera una vez, se busca antes de generar y se guarda (`docs/bbdd/README.md`) | Igual |

**Qué se cachearía en producción** (capa 3), con su duración y cuándo se invalida:
- **Catálogo y ficha pública de un curso:** hoy se leen de la BBDD en cada petición. Se guardarían 1 hora y se invalidarían al publicar o cambiar un curso.
- **Resúmenes y respuestas de IA que no son de un alumno** (como el resumen del Radar): hasta que cambien sus datos de entrada.
- **Nunca** nada con datos de un alumno: progreso, puntos, canjes, mensajes, sesión. Esas peticiones siempre van a la BBDD.

**Cómo se pasaría a Upstash sin reescribir el código:** Next.js 16 trae `"use cache"`, que guarda en memoria, y `'use cache: remote'` con un `cacheHandler`, que lleva esa misma caché a un almacén externo como Redis. El paso a producción es cambiar la directiva y configurar el almacén; las funciones que leen los datos no cambian.

**Alternativas:** montar ya Upstash o Vercel KV; un proxy propio delante de la API; no cachear nada.
**Por qué:** en Vercel cada instancia del servidor tiene su propia memoria, así que la caché en memoria no se comparte: en el peor caso se repite una lectura o una llamada barata, pero nunca se da un dato equivocado. Para el tráfico de una demo es suficiente, y nos ahorra otro servicio, otra clave y otro coste. Upstash tiene sentido cuando haya tráfico real y muchas instancias: entonces evita repetir llamadas a la BBDD y a la IA. Antes de contratarlo hay que confirmar que los datos se quedan en una región de la UE (decisión 1) y revisar el precio.

