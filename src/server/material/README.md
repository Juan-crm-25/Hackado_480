# material

Material de cada clase (resumen, tarjetas, infografía): se busca y, si no existe, se genera una vez y se guarda. Material personal a petición del alumno (cuenta para el límite diario).

- **Tablas:** material_clase, material_personal
- **Endpoints:** `/api/modulos/:id/material`, `/api/modulos/:id/infografias`, `/api/material-personal` (y, previsto en el #39, `/api/clases/:id/material/:tipo`)
- **Material común** (#15): `repositorio.ts` guarda y lee `material_clase` (`guardarMaterialClase()`, `materialGuardado()`, `leerMaterialPublicado()`); `pendientes.ts` decide qué le falta a cada vídeo; `servicio.ts` lo sirve al usuario de la sesión con el curso (`leerMaterialDelModulo()` para la pantalla, `materialComunDelModulo()` e `infografiasDelModulo()` para la API). Lo genera `npm run generar:material` (se ejecuta con `tsx --conditions=react-server`, como `generar:ejercicios`). Ver [docs/bbdd/README.md](../../../docs/bbdd/README.md), «Generar el material común».

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
