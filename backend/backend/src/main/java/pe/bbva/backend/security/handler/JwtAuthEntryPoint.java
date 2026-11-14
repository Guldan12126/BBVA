package pe.bbva.backend.security.handler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import pe.bbva.backend.exception.ErrorCode;

import java.io.IOException;

/** Responde 401 en JSON cuando falta el token o no es válido. */
@Component
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        RespuestaJson.escribir(response, ErrorCode.NO_AUTENTICADO, request.getRequestURI());
    }
}
