# Decisiones — Equipo A

## 1. Stack tecnológico

**Decisión:** Next.js (TypeScript) como PWA, con Tailwind CSS y shadcn/ui para la interfaz, API en las propias rutas de Next.js y SQLite como base de datos.
**Alternativas:** React con un backend separado en FastAPI (Python), o una app nativa.
**Por qué:** con un solo proyecto y un solo lenguaje, los cuatro miembros del equipo podemos trabajar en paralelo y construir el prototipo en las 4 horas de la segunda sesión. Una PWA cumple el requisito móvil sin app nativa: se puede instalar, cachea la interfaz y carga rápido en 4G. SQLite no necesita servidor y su migración a PostgreSQL en producción es directa.

## 2. Modelo y proveedor de IA

**Decisión:** modelos de pesos abiertos alojados por un proveedor europeo, detrás de una capa propia con API compatible con OpenAI. Elegimos **Scaleway Generative APIs**, que documenta que no retiene los datos, y el modelo **`gemma-4-26b-a4b-it`** (0,25 € por millón de tokens de entrada y 0,50 € por millón de salida) para todos los agentes. Si la generación de ejercicios se queda corta, se cambia solo ese modelo por uno mayor.
**Alternativas:** las APIs de los fabricantes chinos (DeepSeek, Alibaba), los modelos comerciales de EE. UU. (OpenAI, Anthropic, Google), Mistral o los planes gratuitos.
**Por qué:** hay alumnos menores y se aplica el RGPD. Las APIs chinas implican una transferencia de datos fuera de la UE sin garantías (en Italia ya se bloqueó DeepSeek), y los planes gratuitos usan los datos para entrenar. Con un modelo abierto alojado en la UE se consigue el precio bajo de esos modelos sin que los datos salgan de Europa. La capa propia permite cambiar de proveedor si cambian los precios o la calidad.

## 3. Decisión de producto que más condiciona la solución

**Decisión:** la IA trabaja **dentro de cada módulo y anclada a su contenido**: un tutor por módulo, limitado a su temario, y ejercicios generados a partir de los ejemplos del profesor. No hay un asistente general.
**Alternativas:** un chatbot general para todo el curso, o ejercicios escritos a mano sin IA.
**Por qué:** si el tutor solo conoce su temario, no se inventa respuestas y cita el vídeo y el minuto, y así lleva al alumno de vuelta al contenido. Que los ejercicios partan de ejemplos del profesor evita que la IA se desvíe y respeta que cada curso evalúa de forma distinta (no es lo mismo una oposición que desarrollo web). Además, el material generado por módulo se comparte entre alumnos, y eso mantiene el coste bajo.
