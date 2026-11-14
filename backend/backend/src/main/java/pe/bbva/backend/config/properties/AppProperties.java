package pe.bbva.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** Configuración general de la aplicación (app.*). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String frontendUrl,
        List<String> corsOrigins,
        boolean mailEnabled,
        String mailFrom,
        int notificacionVigenciaMinutos,
        boolean datosDemo) {
}
