package pe.bbva.backend.event;

/** Se publica cuando un usuario cambia o recupera su contraseña. */
public record PasswordCambiadaEvent(Long usuarioId, String ip) {
}
