package pe.bbva.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Valores de app.ia.* (conexión con el microservicio FastAPI) */
@ConfigurationProperties(prefix = "app.ia")
public record IaProperties(
        boolean enabled,
        String url,
        String apiKey,
        int timeoutMs) {
}
