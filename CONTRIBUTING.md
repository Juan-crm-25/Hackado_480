# Cómo trabajamos — Equipo A

## Roles

| Rol | Persona | Qué hace |
|---|---|---|
| Repositorio | Juan | Revisa que las PRs cumplan las normas, cuida `main` y resuelve los conflictos de integración |
| Bitácora | Antonio | Apunta en `BITACORA.md` cada sesión: quién hizo qué, qué problemas hubo y qué se decidió |
| Contacto con el cliente | Héctor | Reúne las dudas, apunta las respuestas (también las que da a otros equipos) y avisa al grupo de los cambios |

El resto del trabajo se reparte cogiendo issues del backlog: cada uno se asigna los que quiera.

## Tablero (GitHub Projects)

Columnas: **Pendiente → En curso → En revisión → Hecho**.

- Cada historia de usuario y cada tarea técnica es un issue con su prioridad y su estimación.
- Para coger un issue, te lo asignas en GitHub y lo mueves a *En curso*, nunca solo diciéndolo por WhatsApp.
- Como máximo **1 issue en curso por persona**.

## Ramas y pull requests

- `main` siempre funciona y es lo que se enseña en la demo. **Nadie sube cambios directamente a `main`.**
- Una rama por issue: `feat/12-tutor-modulo`, `fix/20-error-correccion`, `docs/bitacora-23-11`.
- PRs pequeñas, de 1 o 2 horas de trabajo como mucho, que enlazan su issue con `Closes #12`.
- Cada PR necesita **1 revisión** de otro compañero. Nadie aprueba su propia PR.
- Antes de abrir la PR: `git pull origin main` y comprobar que el proyecto arranca.
- Commits cortos y en español: `feat: tutor responde con cita al vídeo`.

## Cuándo algo está terminado

Un issue pasa a *Hecho* solo si:

1. Cumple los criterios de aceptación de la historia.
2. Funciona **en un móvil real** o, como mínimo, en el modo móvil del navegador.
3. Está fusionado en `main` y `main` sigue arrancando.
4. Si toca un agente, sus instrucciones están actualizadas en `agents/`.
5. Si se tomó alguna decisión o hubo algún problema, se ha avisado a Antonio para la bitácora.

## Comunicación

- **WhatsApp** para lo rápido: "voy con el #12", "me he quedado bloqueado".
- **Issues y PRs** para todo lo que haya que recordar. Si se decide algo en WhatsApp, se copia en el issue.
- **Semana intermedia:** una mini reunión de 10 minutos un par de días (por ejemplo, el miércoles y el viernes). Cada uno cuenta qué hizo, qué hará y si algo le bloquea.

## Sesión del 30/11

| Hora | Qué |
|---|---|
| 10:00 | Puesta en común de 10 minutos; cada uno confirma su issue |
| 11:00 y 12:00 | Puntos de control de 5 minutos para ver quién está bloqueado |
| 12:30 | Congelación: solo se integra y se arreglan errores |
| 13:15 | Ensayo de la demo en el móvil |

## Cambios del cliente

1. Héctor lo apunta y lo comparte en el grupo.
2. Entre todos decidís en 5 minutos si entra.
3. Se crea o modifica el issue correspondiente.
4. Antonio lo registra en la bitácora.
