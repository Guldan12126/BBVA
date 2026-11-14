package pe.bbva.backend.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Valores iniciales del motor de riesgo (luego se editan desde /api/parametros). */
@ConfigurationProperties(prefix = "app.riesgo")
public record RiesgoProperties(
        double umbralAlerta,
        double umbralCritico,
        double pesoIa) {
}
