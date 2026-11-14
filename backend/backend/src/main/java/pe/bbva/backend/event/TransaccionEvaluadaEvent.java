package pe.bbva.backend.event;

/** Se publica cada vez que una transacción termina de evaluarse. */
public record TransaccionEvaluadaEvent(Long transaccionId) {
}
