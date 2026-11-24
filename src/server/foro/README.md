# foro

Temas por clase y comentarios. Al crear un comentario, el agente validador de `lib/agentes` lo valora después de responder (`validado_por = 'ia'`); el profesor puede cambiarlo y prevalece.

- **Tablas:** tema_foro, comentario_foro
- **Endpoints:** `/api/clases/:id/temas`, `/api/temas/:id`, `/api/temas/:id/comentarios`, `/api/comentarios/:id/validacion`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
