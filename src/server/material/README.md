# material

Material de cada clase (resumen, tarjetas, infografía): se busca y, si no existe, se genera una vez y se guarda. Material personal a petición del alumno (cuenta para el límite diario).

- **Tablas:** material_clase, material_personal
- **Endpoints:** `/api/modulos/:id/material`, `/api/modulos/:id/infografias`, `/api/modulos/:id/videos/:video/estudio` (#39) y `/api/material-personal`
- **Material común** (#15): `repositorio.ts` guarda y lee `material_clase` (`guardarMaterialClase()`, `materialGuardado()`, `leerMaterialPublicado()`); `pendientes.ts` decide qué le falta a cada vídeo; `servicio.ts` lo sirve al usuario de la sesión con el curso (`leerMaterialDelModulo()` para la pantalla, `materialComunDelModulo()` e `infografiasDelModulo()` para la API). Lo genera `npm run generar:material` (se ejecuta con `tsx --conditions=react-server`, como `generar:ejercicios`). Ver [docs/bbdd/README.md](../../../docs/bbdd/README.md), «Generar el material común».
- **Panel de estudio de cada vídeo** (#39): `estudioDelVideo()` junta la transcripción del vídeo (de `documento`, agrupada en bloques de ~30 s) y su material revisado (`leerMaterialPublicado()` con el slug del vídeo). Lo pinta `src/components/modulo/panel-estudio.tsx` dentro de cada vídeo del módulo.

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
