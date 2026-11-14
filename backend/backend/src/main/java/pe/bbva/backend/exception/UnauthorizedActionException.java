package pe.bbva.backend.exception;

/** 403: el usuario no puede hacer esta acción con su rol. */
public class UnauthorizedActionException extends BusinessException {

    public UnauthorizedActionException(String mensaje) {
        super(ErrorCode.ACCESO_DENEGADO, mensaje);
    }
}
