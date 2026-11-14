package pe.bbva.backend.exception;

import org.springframework.http.HttpStatus;

/** Códigos de error fijos. React puede usar el código para mostrar el mensaje correcto. */
public enum ErrorCode {
    RECURSO_NO_ENCONTRADO(HttpStatus.NOT_FOUND, "No se encontró el recurso solicitado"),
    VALIDACION(HttpStatus.BAD_REQUEST, "Los datos enviados no son válidos"),
    REGLA_NEGOCIO(HttpStatus.BAD_REQUEST, "La operación no cumple las reglas del negocio"),
    JSON_INVALIDO(HttpStatus.BAD_REQUEST, "El cuerpo de la petición no es un JSON válido"),

    CREDENCIALES_INVALIDAS(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos"),
    NO_AUTENTICADO(HttpStatus.UNAUTHORIZED, "Debes iniciar sesión"),
    TOKEN_INVALIDO(HttpStatus.UNAUTHORIZED, "El token no es válido o ya venció"),
    USUARIO_BLOQUEADO(HttpStatus.LOCKED, "Usuario bloqueado temporalmente por intentos fallidos"),
    USUARIO_INACTIVO(HttpStatus.FORBIDDEN, "El usuario está inactivo"),
    ACCESO_DENEGADO(HttpStatus.FORBIDDEN, "No tienes permisos para realizar esta acción"),

    CORREO_YA_REGISTRADO(HttpStatus.CONFLICT, "El correo ya está registrado"),
    DNI_YA_REGISTRADO(HttpStatus.CONFLICT, "El DNI ya está registrado"),
    CONFLICTO_DATOS(HttpStatus.CONFLICT, "La operación entra en conflicto con datos existentes"),

    CODIGO_INVALIDO(HttpStatus.BAD_REQUEST, "El código de verificación es incorrecto"),
    CODIGO_VENCIDO(HttpStatus.BAD_REQUEST, "El código venció, solicita uno nuevo"),
    CODIGO_AGOTADO(HttpStatus.BAD_REQUEST, "Superaste el número de intentos, solicita un nuevo código"),
    ESPERA_REENVIO(HttpStatus.TOO_MANY_REQUESTS, "Espera un momento antes de solicitar otro código"),
    PASSWORD_INCORRECTA(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta"),
    PASSWORDS_NO_COINCIDEN(HttpStatus.BAD_REQUEST, "Las contraseñas no coinciden"),

    TARJETA_NO_ACTIVA(HttpStatus.BAD_REQUEST, "La tarjeta no está activa"),
    ALERTA_YA_DECIDIDA(HttpStatus.CONFLICT, "La alerta ya fue confirmada o descartada"),
    NOTIFICACION_EXPIRADA(HttpStatus.GONE, "El enlace de validación ya venció"),
    NOTIFICACION_RESPONDIDA(HttpStatus.CONFLICT, "Esta compra ya fue validada"),

    SERVICIO_IA_NO_DISPONIBLE(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de Inteligencia Artificial no está disponible"),
    ERROR_INTERNO(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado");

    private final HttpStatus status;
    private final String mensaje;

    ErrorCode(HttpStatus status, String mensaje) {
        this.status = status;
        this.mensaje = mensaje;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getMensaje() {
        return mensaje;
    }
}
