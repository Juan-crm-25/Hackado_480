# Hackadó 480 · Equipo A

Prototipo para **480 Academy**: una web móvil (PWA) en la que cada módulo del curso tiene un **tutor de IA** limitado a su temario, **ejercicios de verificación** generados a partir de ejemplos del profesor y un **Radar** para los tutores humanos.

- Diseño completo: [SPEC.md](SPEC.md)
- Decisiones: [docs/decisiones.md](docs/decisiones.md)
- Contrato de la API: [docs/api.md](docs/api.md)
- Cómo trabajamos: [CONTRIBUTING.md](CONTRIBUTING.md)
- Bitácora: [BITACORA.md](BITACORA.md)
- Tablero: [GitHub Projects](https://github.com/users/Juan-crm-25/projects/3)

## Requisitos

- **Node.js 20 o superior** (recomendado el LTS). En Windows: `winget install OpenJS.NodeJS.LTS`
- Git

> **Windows y PowerShell:** si `npm` da el error *«running scripts is disabled on this system»*, usa `npm.cmd` en lugar de `npm` (por ejemplo, `npm.cmd run dev`). También puedes usar cmd o Git Bash.

## Arrancar el proyecto

```bash
npm install
cp .env.example .env.local   # y rellena las claves (en Windows: copy .env.example .env.local)
npm run dev
```

Abre http://localhost:3000. Para verlo como en el móvil, usa el modo móvil de las herramientas de desarrollo del navegador (360 px de ancho).

Para probar desde tu teléfono en la misma red wifi, abre `http://<IP-de-tu-ordenador>:3000`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción (hazlo antes de fusionar) |
| `npm run lint` | Revisa el código |
| `npm test` | Ejecuta los tests |
| `npm run test:ia` | Prueba la conexión real con el proveedor de IA (necesita la clave en `.env.local`) |
| `npm run generar:material` | Genera el resumen y las tarjetas comunes de los módulos con transcripciones (`-- m2-css` para uno solo, `-- --forzar` para regenerar). Revisa el resultado y pon `"revisado": true` |
| `npm run generar:infografias` | Genera una infografía por concepto (mismas opciones). Revisa el resultado y pon `"revisado": true` |

## Capa de IA

Todo el acceso a la IA pasa por `src/lib/ai/`:

| Fichero | Qué hace |
|---|---|
| `cliente.ts` | `completar()`: la única función que llama al proveedor (API compatible con OpenAI) |
| `privacidad.ts` | `filtrarTexto()` quita emails, teléfonos, DNI, IBAN, tarjetas y nombres; `seudonimo()` oculta la identidad del alumno |
| `limite.ts` | Límite diario de consultas por alumno |
| `config.ts` | Lee la configuración de `.env.local` |

- `completar()` **solo acepta texto filtrado**: el texto de un alumno tiene que pasar por `filtrarTexto()`, y el contenido del curso por `contenidoDelCurso()`. Si no, TypeScript da error.
- **Sin clave**, la IA funciona en **modo simulado** y devuelve respuestas fijas. Así se puede desarrollar sin cuenta en el proveedor.

```ts
import { completar } from "@/lib/ai/cliente";
import { contenidoDelCurso, filtrarTexto } from "@/lib/ai/privacidad";

const { texto } = await completar({
  modelo: "tutor",
  mensajes: [
    { rol: "sistema", contenido: contenidoDelCurso(instrucciones) },
    { rol: "usuario", contenido: filtrarTexto(preguntaDelAlumno, [alumno.nombre]).texto },
  ],
});
```

## Estructura

```
data/
  catalog.json          Curso, módulos, vídeos y conceptos (sin panel de administración)
docs/                   Decisiones, API, fotos de los bocetos
src/
  app/
    api/                Endpoints de la API (ver docs/api.md)
    page.tsx            Pantalla de inicio (provisional, ver #14)
  components/ui/        Componentes de shadcn/ui
  lib/
    types.ts            Tipos compartidos: EL CONTRATO. Avisa antes de cambiarlos
    catalogo.ts         Lectura del catálogo
    datos-prueba.ts     Datos de prueba hasta que exista la BBDD
scripts/                Backlog y creación de issues
```

Para añadir componentes de shadcn/ui: `npx shadcn@latest add <componente>`.

## Tecnologías

Next.js 16 (TypeScript) · Tailwind CSS 4 · shadcn/ui · SQLite · modelos de pesos abiertos alojados en la UE (API compatible con OpenAI).
