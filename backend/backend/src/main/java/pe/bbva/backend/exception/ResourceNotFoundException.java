package pe.bbva.backend.exception;

/** 404: el recurso no existe. */
public class ResourceNotFoundException extends BusinessException {

    public ResourceNotFoundException(String recurso, Object id) {
        super(ErrorCode.RECURSO_NO_ENCONTRADO, recurso + " no encontrado(a): " + id);
    }
}
