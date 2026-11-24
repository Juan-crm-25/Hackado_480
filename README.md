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
| `npm run db:up` / `npm run db:down` | Arranca o para la BBDD local en Docker, en el puerto 5433 (ver [docs/bbdd](docs/bbdd/README.md#5-entornos-y-variables-de-entorno)) |
| `npm run db:generate` | Genera la migración SQL en `drizzle/` a partir del esquema (`src/lib/db/schema/`) |
| `npm run db:migrate` | Aplica las migraciones pendientes a la BBDD de `DATABASE_URL` |
| `npm run db:studio` | Abre Drizzle Studio para ver y editar los datos |
| `npm run generar:material` | Genera el resumen y las tarjetas comunes de los módulos con transcripciones (`-- m2-css` para uno solo, `-- --forzar` para regenerar). Revisa el resultado y pon `"revisado": true` |
| `npm run generar:infografias` | Genera una infografía por concepto (mismas opciones). Revisa el resultado y pon `"revisado": true` |

### Volver a descargar las transcripciones

No hace falta para trabajar: las 12 transcripciones ya están en `data/transcripciones/`. Solo si cambia algún vídeo de `data/catalog.json`. Necesita Python 3.10+ y [yt-dlp](https://github.com/yt-dlp/yt-dlp):

```bash
pip install yt-dlp
python scripts/transcripciones/descargar.py          # los 12 vídeos
python scripts/transcripciones/descargar.py v04 v05  # solo esos
```

Descarga los subtítulos en español de YouTube (sin bajar el vídeo), los limpia y los guarda en VTT con sus marcas de tiempo. Al terminar muestra los tokens aproximados del temario de cada módulo. Si cambian las transcripciones, el material y las infografías de ese módulo quedan desfasados: vuelve a generarlos con `-- --forzar`. Cómo y por qué se hace así: [SPEC.md, apartado 8](SPEC.md#8-contenido).

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
data/                   Origen del seed (catálogo, transcripciones, material). Se borrará cuando
                        el código lea de la BBDD: no añadas ficheros de datos nuevos aquí
docs/                   Decisiones, API, fotos de los bocetos
  bbdd/                 Modelo de datos, reglas y variables de entorno (la BBDD manda)
drizzle/                Migraciones SQL generadas con npm run db:generate (no se editan a mano)
src/
  app/
    api/                Endpoints de la API (ver docs/api.md)
    page.tsx            Pantalla de inicio (provisional, ver #14)
  components/ui/        Componentes de shadcn/ui
  lib/
    types.ts            Tipos compartidos: EL CONTRATO. Avisa antes de cambiarlos
    db/                 BBDD: esquema de Drizzle (schema/) y cliente (client.ts)
    catalogo.ts         Lectura del catálogo
    datos-prueba.ts     Datos de prueba hasta que exista la BBDD
scripts/                Backlog y creación de issues
```

Para añadir componentes de shadcn/ui: `npx shadcn@latest add <componente>`.

## Despliegue (Vercel)

- El repositorio está conectado a Vercel: cada cambio en `main` se publica solo, y cada PR tiene su propia URL de prueba.
- Las funciones se ejecutan en **París** (`vercel.json`), así que los datos de los alumnos se procesan en la UE.
- Las variables de `.env.example` se configuran en el panel de Vercel (Settings → Environment Variables), nunca en el repositorio. Qué es cada una y de dónde sale: [docs/bbdd/README.md](docs/bbdd/README.md#5-entornos-y-variables-de-entorno).
- `next.config.ts` incluye en el despliegue `agents/` y `data/`, que el servidor lee al responder.

## Tecnologías

Next.js 16 (TypeScript) · Tailwind CSS 4 · shadcn/ui · PostgreSQL en Neon (UE) con Drizzle · Better Auth · Cloudflare R2 (UE) · Stripe (modo test) · Vercel (funciones en París) · modelos de pesos abiertos alojados en la UE (API compatible con OpenAI).
