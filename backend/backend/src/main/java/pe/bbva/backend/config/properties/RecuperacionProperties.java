package pe.bbva.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Reglas del código de verificación para recuperar la contraseña. */
@ConfigurationProperties(prefix = "app.recuperacion")
public record RecuperacionProperties(
        int vigenciaMinutos,
        int maxIntentos,
        int esperaReenvioSegundos,
        int vigenciaResetMinutos) {
}
