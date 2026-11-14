package pe.bbva.backend.event;

/** Se publica cuando el analista confirma o descarta un fraude. */
public record DecisionTomadaEvent(Long alertaId, Long usuarioId, boolean esFraude, String comentario) {
}
