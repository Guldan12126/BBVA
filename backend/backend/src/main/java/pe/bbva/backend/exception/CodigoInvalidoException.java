package pe.bbva.backend.exception;

/** Código de verificación incorrecto, vencido o con intentos agotados. */
public class CodigoInvalidoException extends BusinessException {

    public CodigoInvalidoException(ErrorCode errorCode) {
        super(errorCode);
    }

    public CodigoInvalidoException(ErrorCode errorCode, String mensaje) {
        super(errorCode, mensaje);
    }
}
