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
- Dar de alta el proveedor de IA y probar los modelos en español.
- Seleccionar los 12 vídeos y sacar sus transcripciones.
- Escribir los ejemplos del profesor y generar el banco de ejercicios.
- Crear la base común del proyecto (proyecto, contrato de tipos y capa de IA).
- Preparar los datos simulados para el Radar.
