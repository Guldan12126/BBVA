package pe.bbva.backend.exception;

/** 503: el microservicio de IA (FastAPI) no respondió. */
public class IaServiceException extends BusinessException {

    public IaServiceException(String mensaje) {
        super(ErrorCode.SERVICIO_IA_NO_DISPONIBLE, mensaje);
    }
}
