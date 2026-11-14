package pe.bbva.backend.security.handler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import pe.bbva.backend.exception.ErrorCode;

import java.io.IOException;

/** Responde 403 en JSON cuando el rol no tiene permiso. */
@Component
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        RespuestaJson.escribir(response, ErrorCode.ACCESO_DENEGADO, request.getRequestURI());
    }
}
