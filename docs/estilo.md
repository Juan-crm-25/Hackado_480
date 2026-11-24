# Guía de estilo

Estilo visual de la app, inspirado en la web de [Cuatroochenta](https://cuatroochenta.com/) y adaptado a **Tailwind CSS 4 + shadcn/ui** (`components.json`: estilo `base-nova`, variables CSS activas).

Los valores salen de los estilos calculados de la web en noviembre de 2026. Los tokens están en OKLCH para pegarlos tal cual en `src/app/globals.css`.

## 1. Idea general

- **Base clara y bloques oscuros.** Fondo blanco, con tarjetas y secciones destacadas en un casi negro (`#1F2222`).
- **Un acento neón.** El verde `#39FE90` es la marca: se usa poco y siempre sobre fondo oscuro o como relleno con texto oscuro.
- **Titulares grandes y en negrita**, texto normal sobrio y gris.
- **Formas suaves.** Radios pequeños (4–8 px) y sombras discretas.

## 2. Paleta de la marca

| Nombre | Hex | OKLCH | Uso en 480 |
| --- | --- | --- | --- |
| Verde 480 | `#39FE90` | `oklch(0.880 0.213 152.8)` | Logo, acentos, botones de los avisos |
| Cian | `#1CF9FC` | `oklch(0.892 0.149 196.4)` | Color secundario de la marca |
| Coral | `#FF4950` | `oklch(0.670 0.218 23.4)` | Botón "Contacto", comillas de los titulares |
| Azul | `#2196F3` | `oklch(0.658 0.169 248.8)` | Enlaces y bordes suaves (`rgba(33,150,243,.2)`) |
| Carbón | `#1F2222` | `oklch(0.249 0.004 196.9)` | Bloques oscuros, botones, texto principal |
| Noche | `#16191B` | `oklch(0.211 0.006 236.9)` | Tarjetas oscuras y sus bordes |
| Texto | `#212121` | `oklch(0.248 0 0)` | Texto principal |
| Gris texto | `#4D4D4D` | `oklch(0.420 0 0)` | Texto secundario |
| Gris claro | `#F4F4F4` | `oklch(0.967 0 0)` | Fondos suaves |
| Línea | `#EBEBEB` | `oklch(0.940 0 0)` | Bordes y separadores |

### Contraste (WCAG AA: 4,5 para texto normal)

| Combinación | Contraste | ¿Se puede usar? |
| --- | --- | --- |
| Verde 480 sobre blanco | 1,33 | **No**, ni para texto ni para iconos |
| Verde 480 sobre carbón | 12,02 | Sí |
| Carbón sobre verde 480 | 12,02 | Sí (botón verde con texto oscuro) |
| Cian sobre carbón | 12,22 | Sí |
| Coral sobre blanco | 3,32 | Solo para texto grande (≥ 24 px) o decoración |
| Coral sobre carbón | 4,82 | Sí |
| Azul sobre blanco | 3,12 | Solo para texto grande o bordes |
| Gris texto sobre blanco | 8,45 | Sí |
| Carbón sobre blanco | 16,03 | Sí |

**Regla:** el verde nunca va como texto ni como borde de foco sobre fondo claro. Por eso, en modo claro, `--primary` es el carbón, el verde va en `--accent` (siempre con texto carbón) y el foco es azul.

## 3. Tokens para shadcn

Sustituye los bloques `:root` y `.dark` de `src/app/globals.css`:

```css
:root {
  --background: oklch(1 0 0);                 /* blanco */
  --foreground: oklch(0.248 0 0);             /* #212121 */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.248 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.248 0 0);
  --primary: oklch(0.249 0.004 196.9);        /* carbón #1F2222 */
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.967 0 0);              /* #F4F4F4 */
  --secondary-foreground: oklch(0.249 0.004 196.9);
  --muted: oklch(0.967 0 0);
  --muted-foreground: oklch(0.420 0 0);       /* #4D4D4D */
  --accent: oklch(0.880 0.213 152.8);         /* verde 480 */
  --accent-foreground: oklch(0.249 0.004 196.9);
  --destructive: oklch(0.577 0.245 27.325);   /* rojo de shadcn: el coral no llega a AA sobre blanco */
  --border: oklch(0.940 0 0);                 /* #EBEBEB */
  --input: oklch(0.940 0 0);
  --ring: oklch(0.658 0.169 248.8);           /* foco en azul: el verde no llega a 3:1 sobre blanco */
  --chart-1: oklch(0.880 0.213 152.8);        /* verde */
  --chart-2: oklch(0.892 0.149 196.4);        /* cian */
  --chart-3: oklch(0.658 0.169 248.8);        /* azul */
  --chart-4: oklch(0.670 0.218 23.4);         /* coral */
  --chart-5: oklch(0.420 0 0);                /* gris */
  --radius: 0.5rem;                           /* 8 px, el de las tarjetas */
  --sidebar: oklch(0.249 0.004 196.9);
  --sidebar-foreground: oklch(1 0 0);
  --sidebar-primary: oklch(0.880 0.213 152.8);
  --sidebar-primary-foreground: oklch(0.249 0.004 196.9);
  --sidebar-accent: oklch(0.211 0.006 236.9);
  --sidebar-accent-foreground: oklch(1 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.880 0.213 152.8);

  /* Extra de la marca (no son de shadcn) */
  --brand: oklch(0.880 0.213 152.8);
  --brand-cyan: oklch(0.892 0.149 196.4);
  --brand-coral: oklch(0.670 0.218 23.4);
  --surface-dark: oklch(0.249 0.004 196.9);   /* bloques oscuros en modo claro */
  --surface-darker: oklch(0.211 0.006 236.9);
}

.dark {
  --background: oklch(0.211 0.006 236.9);     /* #16191B */
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.249 0.004 196.9);           /* #1F2222 */
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.249 0.004 196.9);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.880 0.213 152.8);        /* en oscuro, el verde sí puede ser primario */
  --primary-foreground: oklch(0.249 0.004 196.9);
  --secondary: oklch(0.300 0.004 196.9);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.300 0.004 196.9);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.892 0.149 196.4);         /* cian */
  --accent-foreground: oklch(0.249 0.004 196.9);
  --destructive: oklch(0.670 0.218 23.4);     /* coral: 4,82 sobre carbón */
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.880 0.213 152.8);
  /* chart-* y sidebar-*: los mismos que en :root */
}
```

Para usar los colores extra como clases (`bg-brand`, `text-brand-coral`…), añade en `@theme inline`:

```css
--color-brand: var(--brand);
--color-brand-cyan: var(--brand-cyan);
--color-brand-coral: var(--brand-coral);
--color-surface-dark: var(--surface-dark);
--color-surface-darker: var(--surface-darker);
```

## 4. Tipografía

La web usa **LL Circular** (Book, Medium y Bold), que es de pago. La sustituimos por **DM Sans**, gratuita, geométrica y muy parecida, cargada con `next/font/google` en `src/app/layout.tsx` en lugar de Geist:

```tsx
import { DM_Sans, Geist_Mono } from "next/font/google";
const dmSans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
// Geist Mono se queda para el código (--font-geist-mono → font-mono).
```

DM Sans es una fuente variable: no hace falta indicar los pesos.

| Rol | Peso | Tamaño / interlineado | Clases Tailwind |
| --- | --- | --- | --- |
| Titular de portada | 700 | 28–36 px / 1.15 | `text-3xl md:text-4xl font-bold leading-tight` |
| Titular de sección (h1/h2) | 700 | 23 px / 1.2 | `text-2xl font-bold leading-tight` |
| Título de tarjeta | 700 | 19–24 px / 1.2 | `text-xl font-bold` |
| Navegación | 500 | 17 px / 1.5 | `text-base font-medium` |
| Texto normal | 400 | 16 px / 1.5 | `text-base` |
| Texto pequeño | 400 | 14 px / 1.5 | `text-sm` |
| Etiquetas y metadatos | 600 | 12 px / 2 | `text-xs font-semibold` |
| Etiqueta de categoría | 600 | 12 px, mayúsculas | `text-xs font-semibold uppercase` |

Recurso de la marca: algunos titulares van en mayúsculas, con las comillas `«»` en coral. Úsalo solo en la portada.

## 5. Fondos

| Superficie | Modo claro | Clase |
| --- | --- | --- |
| Página | Blanco | `bg-background` |
| Sección suave | `#F4F4F4` | `bg-muted` |
| Sección o tarjeta destacada | Carbón | `bg-surface-dark text-white` |
| Tarjeta más oscura | Noche | `bg-surface-darker text-white` |
| Barra de navegación fija | Carbón al 85 % con desenfoque | `bg-surface-dark/85 backdrop-blur` |
| Imagen de fondo con texto | Foto en blanco y negro + capa oscura | `bg-cover` + `bg-black/50` encima |

## 6. Cajas y tarjetas

Dos variantes, sobre el componente `Card` de shadcn:

- **Tarjeta clara:** `rounded-lg border bg-card shadow-sm`.
- **Tarjeta oscura (la de 480):** `rounded-lg bg-surface-darker text-white border-4 border-surface-darker`, con título grande en negrita y etiquetas pequeñas abajo.

| Elemento | Valor | Clase |
| --- | --- | --- |
| Radio de tarjeta | 8 px | `rounded-lg` |
| Radio de botón | 4 px (4,8 px con `--radius: 0.5rem`) | `rounded-sm` |
| Radio de píldora | 34 px | `rounded-full` |
| Avatar e iconos redondos | 50 % | `rounded-full` |
| Borde fino | 1 px `#EBEBEB` | `border` |
| Borde de acento | 2 px verde | `border-2 border-brand` (solo sobre fondo oscuro: sobre blanco no llega a 3:1) |
| Sombra suave | `0 4px 12px rgba(0,0,0,.15)` | `shadow-md` |
| Sombra elevada (modal) | `0 32px 68px rgba(0,0,0,.3)` | `shadow-2xl` |

## 7. Botones

Variantes de `Button` de shadcn:

| Variante | Aspecto | Uso |
| --- | --- | --- |
| `default` | Fondo carbón, texto blanco | Acción principal |
| `accent` (nueva) | `bg-brand text-surface-dark hover:bg-brand/90` | Acción destacada (empezar, enviar) |
| `outline` | Borde fino, fondo blanco | Acción secundaria |
| `ghost` | Sin fondo | Acciones de la barra |
| `destructive` | Rojo | Borrar, salir |

Tamaño mínimo táctil de **44 px** de alto (`h-11`), porque la app es mobile-first y se usa con una mano. Es el tamaño `default` de `Button` (y de `Toggle`, `TabsList` y `SelectTrigger`), así que no hace falta añadir `h-11` a mano. Los tamaños `xs`, `sm`, `icon-xs` e `icon-sm` son solo para contextos sin pantalla táctil.

El texto del botón `accent` es `text-surface-dark` y no `text-primary`: en modo oscuro `--primary` es el verde y el texto desaparecería sobre el fondo verde.

## 8. Transiciones

| Uso | Duración y curva | Clases |
| --- | --- | --- |
| Botones y enlaces (color, fondo, borde) | 150 ms ease-in-out | `transition-colors duration-150 ease-in-out` |
| Iconos (filtro, opacidad) | 300 ms ease-out | `transition duration-300 ease-out` |
| Barra de navegación al hacer scroll | 300 ms ease-in | `transition-all duration-300 ease-in` |
| Aparición de bloques | 600 ms ease-out, de opacidad 0 a 1 | `motion-safe:animate-in motion-safe:fade-in duration-600 ease-out` (tw-animate-css) |
| Abrir y cerrar paneles | 350 ms ease-in-out | `duration-300 ease-in-out` |

Respeta `prefers-reduced-motion` con `motion-safe:` en las animaciones de entrada. Además, `globals.css` anula animaciones y transiciones cuando el sistema pide movimiento reducido, y el desplazamiento del chat deja de ser suave.

## 9. Reglas rápidas

1. Verde solo sobre fondo oscuro o como relleno con texto carbón.
2. Coral solo para texto grande, decoración o errores en modo oscuro.
3. Un único acento por pantalla: verde o cian, no los dos a la vez.
4. Texto secundario en `text-muted-foreground`, nunca en gris más claro que `#4D4D4D` sobre blanco.
5. El foco del teclado siempre visible: `ring` azul en modo claro y verde en modo oscuro.
6. En gráficos sobre fondo blanco, el verde y el cian necesitan un borde oscuro o etiquetas con el valor, porque no llegan a 3:1.
7. `--accent` es el verde (cian en oscuro), no un gris suave como en shadcn. Los componentes que lo usan para resaltar al pasar el ratón (por ejemplo los elementos de `Select`) se cambian a `bg-muted`.

## 10. Patrones de pantalla

### Contenedor de página

Cada pantalla es un `<main className="mx-auto flex w-full max-w-md flex-col …">`: una columna centrada pensada para 360 px. El contenido lleva `px-4`. No añadas otros anchos máximos.

### Cabecera

Las pantallas de un módulo usan `CabeceraPantalla` (`src/components/cabecera-pantalla.tsx`): enlace «Curso» para volver (44 px), sección en `text-xs font-semibold` y título en `text-xl font-bold leading-tight` truncado. Es más pequeño que el titular de sección (`text-2xl`) porque es una barra fija y tiene que caber en una línea a 360 px.

### Estados

Todos están en `src/components/estado.tsx`. No escribas párrafos sueltos para estos casos.

| Componente | Cuándo | Accesibilidad |
| --- | --- | --- |
| `EstadoCargando` | Algo está en marcha (el tutor escribe, se cargan datos). Prop `texto`, por defecto «Cargando…» | `role="status"`: se anuncia sin interrumpir |
| `EstadoVacio` | Aún no hay nada que mostrar. Prop `acciones` para botones (por ejemplo, las sugerencias del tutor) | Sin región viva: es contenido normal |
| `EstadoError` | Algo ha fallado. Nunca se traga un error: si un `fetch` falla, se muestra aquí | `role="alert"`: se anuncia al momento |

Un botón que está trabajando cambia su texto («Creando tu material…») y se desactiva: no hace falta un `EstadoCargando` aparte.

Para leer las respuestas de la API usa `leerRespuesta()` y `mensajeDeError()` de `src/lib/peticiones.ts`.

### Controles de formulario

| Necesitas | Componente de shadcn |
| --- | --- |
| Pestañas | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (flechas del teclado y `tabpanel` incluidos) |
| Elegir una opción entre 2 o 3 visibles | `ToggleGroup` + `ToggleGroupItem` (ver `Opciones` en `mi-material.tsx`) |
| Elegir de una lista larga | `Select` (con `items` para que el valor muestre la etiqueta) |
| Texto libre | `Textarea` |
| Acciones | `Button` (`accent` para la acción destacada, una por pantalla) |
| Etiquetas y píldoras | `Badge` |
| Cajas | `Card` |

Añade componentes nuevos con `npx shadcn@latest add <nombre>` (en Windows, `npx.cmd`) y ajústalos a esta guía: altura táctil, `rounded-sm` en botones, foco con `ring-ring` (sin `/50`), `transition-colors duration-150` y `cn` importado de `@/lib/utils`.

### Infografías y gráficos

Las infografías usan tonos del azul de los gráficos (`bg-chart-3/10` … `bg-chart-3/60`) con el texto en su color normal: así pasan AA en claro y en oscuro. No pases del 60 %.

## 11. Checklist antes de abrir una PR de frontend

- [ ] Solo tokens de color (`bg-primary`, `text-muted-foreground`, `bg-brand`, `chart-*`…). El test `src/estilo.test.ts` falla si aparecen `gray-*`, `sky-*`, hex o `rgb()`.
- [ ] Componentes de shadcn antes que controles hechos a mano.
- [ ] Todo lo que se toca mide al menos 44 px de alto.
- [ ] El foco del teclado se ve en todos los elementos interactivos (prueba con Tab).
- [ ] Carga, vacío y error con `EstadoCargando`, `EstadoVacio` y `EstadoError`. Ningún error silenciado.
- [ ] Nada depende solo del color: hay texto o icono.
- [ ] Se ve bien a 360 px y en modo oscuro.
- [ ] Las animaciones usan `motion-safe:`.
- [ ] Textos de la interfaz en español.
- [ ] `npm test`, `npm run lint` y `npm run build` pasan.
