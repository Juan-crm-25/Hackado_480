# catalogo

Categorías, cursos, módulos, conceptos, clases, documentos (markdown) e imágenes. Las imágenes se suben a Cloudflare R2 con una URL firmada; aquí solo se guarda la URL.

- **Tablas:** categoria, curso, curso_imagen, modulo, concepto, clase, documento, etiqueta, modulo_etiqueta
- **Endpoints:** `/api/categorias`, `/api/cursos`, `/api/cursos/:slug`, `/api/cursos/:id/imagenes` (y `/confirmar`), `/api/modulos/:id`, `/api/clases/:id`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
