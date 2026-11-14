package pe.bbva.backend.security.handler;

import jakarta.servlet.http.HttpServletResponse;
import pe.bbva.backend.exception.ErrorCode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/** Escribe un error en el mismo formato que GlobalExceptionHandler. */
final class RespuestaJson {

    private RespuestaJson() {
    }

    static void escribir(HttpServletResponse response, ErrorCode code, String ruta) throws IOException {
        response.setStatus(code.getStatus().value());
        response.setContentType("application/json");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        String json = "{"
                + "\"fecha\":\"" + LocalDateTime.now() + "\","
                + "\"status\":" + code.getStatus().value() + ","
                + "\"codigo\":\"" + code.name() + "\","
                + "\"mensaje\":\"" + code.getMensaje() + "\","
                + "\"ruta\":\"" + ruta.replace("\"", "") + "\","
                + "\"errores\":null}";
        response.getWriter().write(json);
    }
}
