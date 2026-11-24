# foro

Temas por clase y comentarios. Al crear un comentario se responde sin esperar a la IA y el agente validador de `lib/agentes` lo valora con `after()` (`validado_por = 'ia'`, solo si sigue pendiente). El profesor del curso puede cambiarlo y prevalece. Los pendientes se reintentan al abrir el tema.

- **Tablas:** tema_foro, comentario_foro
- **Endpoints:** `/api/clases/:id/temas`, `/api/temas/:id`, `/api/temas/:id/comentarios`, `/api/comentarios/:id/validacion`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
