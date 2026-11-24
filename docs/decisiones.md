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

## 4. Decisión de producto que más condiciona la solución

**Decisión:** la IA trabaja **dentro de cada módulo y anclada a su contenido**: un tutor por módulo, limitado a su temario, y ejercicios generados a partir de los ejemplos del profesor. No hay un asistente general.
**Alternativas:** un chatbot general para todo el curso, o ejercicios escritos a mano sin IA.
**Por qué:** si el tutor solo conoce su temario, no se inventa respuestas y cita el vídeo y el minuto, y así lleva al alumno de vuelta al contenido. Que los ejercicios partan de ejemplos del profesor evita que la IA se desvíe y respeta que cada curso evalúa de forma distinta (no es lo mismo una oposición que desarrollo web). Además, el material generado por módulo se comparte entre alumnos, y eso mantiene el coste bajo.
