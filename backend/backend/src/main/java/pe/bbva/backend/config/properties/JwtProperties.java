package pe.bbva.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Valores de app.jwt.* del application.properties */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long accessExpirationMinutes,
        long refreshExpirationDays) {
}
