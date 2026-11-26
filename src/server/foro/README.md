# foro

Foro por módulo (H10). Cada tema es una duda; los comentarios forman un árbol (`respuesta_a_id`). Al crear un comentario se responde sin esperar a la IA y el validador de `lib/agentes/validador-foro.ts` lo valora con `after()` (`validado_por = 'ia'`, solo si sigue pendiente). Si es una respuesta, Sensei (la IA, usuario `EMAIL_IA_FORO`) contesta en el hilo con la frase de `lib/foro.ts`, en la misma transacción. No se valoran los comentarios de Sensei, de profesores/admins ni del autor de la duda. Si la IA duda o falla, el comentario queda pendiente y se reintenta al abrir el tema (máximo 5, de hace más de 10 minutos, una vez cada 10 minutos por tema; la marca vive en memoria hasta que exista la caché compartida, #34). El profesor del curso (o un admin) puede valorarlo y prevalece, y da puntos (+1/+3/+6) a temas y comentarios de alumnos.

- **Tablas:** tema_foro, comentario_foro, punto_foro
- **Endpoints:** `GET/POST /api/cursos/:slug/modulos/:modulo/temas`, `GET /api/temas/:id`, `POST /api/temas/:id/comentarios`, `PUT /api/comentarios/:id/validacion`, `PUT/DELETE /api/foro/puntos`

Patrón y reglas: [docs/arquitectura.md](../../../docs/arquitectura.md).
