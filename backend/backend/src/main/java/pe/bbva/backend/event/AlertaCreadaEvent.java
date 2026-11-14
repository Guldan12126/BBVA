package pe.bbva.backend.event;

/** Se publica cuando el motor de riesgo crea una alerta. */
public record AlertaCreadaEvent(Long alertaId) {
}
