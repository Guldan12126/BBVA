package pe.bbva.backend.exception;

/** Error de negocio con un código fijo (ver ErrorCode). */
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMensaje());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String mensaje) {
        super(mensaje);
        this.errorCode = errorCode;
    }

    public BusinessException(String mensaje) {
        this(ErrorCode.REGLA_NEGOCIO, mensaje);
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
