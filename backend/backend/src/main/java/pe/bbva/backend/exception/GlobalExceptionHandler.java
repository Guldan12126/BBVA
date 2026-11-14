package pe.bbva.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/** Convierte todas las excepciones en una respuesta JSON con el mismo formato. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Formato de error que recibe el frontend. */
    public record ApiError(LocalDateTime fecha, int status, String codigo, String mensaje,
                           String ruta, Map<String, String> errores) {
    }

    private ResponseEntity<ApiError> construir(ErrorCode code, String mensaje, HttpServletRequest req,
                                               Map<String, String> errores) {
        ApiError body = new ApiError(LocalDateTime.now(), code.getStatus().value(), code.name(),
                mensaje, req.getRequestURI(), errores);
        return ResponseEntity.status(code.getStatus()).body(body);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiError> negocio(BusinessException ex, HttpServletRequest req) {
        return construir(ex.getErrorCode(), ex.getMessage(), req, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errores = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            errores.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(ge -> errores.putIfAbsent(ge.getObjectName(), ge.getDefaultMessage()));
        return construir(ErrorCode.VALIDACION, ErrorCode.VALIDACION.getMensaje(), req, errores);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> restriccion(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> errores = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> errores.put(v.getPropertyPath().toString(), v.getMessage()));
        return construir(ErrorCode.VALIDACION, ErrorCode.VALIDACION.getMensaje(), req, errores);
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiError> parametro(Exception ex, HttpServletRequest req) {
        return construir(ErrorCode.VALIDACION, "Parámetro inválido o faltante: " + ex.getMessage(), req, null);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> jsonInvalido(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return construir(ErrorCode.JSON_INVALIDO, ErrorCode.JSON_INVALIDO.getMensaje(), req, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> accesoDenegado(AccessDeniedException ex, HttpServletRequest req) {
        return construir(ErrorCode.ACCESO_DENEGADO, ErrorCode.ACCESO_DENEGADO.getMensaje(), req, null);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> autenticacion(AuthenticationException ex, HttpServletRequest req) {
        return construir(ErrorCode.CREDENCIALES_INVALIDAS, ErrorCode.CREDENCIALES_INVALIDAS.getMensaje(), req, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> integridad(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Conflicto de datos: {}", ex.getMostSpecificCause().getMessage());
        return construir(ErrorCode.CONFLICTO_DATOS, ErrorCode.CONFLICTO_DATOS.getMensaje(), req, null);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> noEncontrado(NoResourceFoundException ex, HttpServletRequest req) {
        return construir(ErrorCode.RECURSO_NO_ENCONTRADO, "La ruta no existe", req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> general(Exception ex, HttpServletRequest req) {
        log.error("Error no controlado en {}", req.getRequestURI(), ex);
        return construir(ErrorCode.ERROR_INTERNO, ErrorCode.ERROR_INTERNO.getMensaje(), req, null);
    }
}
