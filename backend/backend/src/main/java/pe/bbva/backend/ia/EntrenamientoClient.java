package pe.bbva.backend.ia;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import pe.bbva.backend.config.properties.IaProperties;
import pe.bbva.backend.exception.IaServiceException;

import java.util.List;
import java.util.Map;

/** POST /train: envía a FastAPI las transacciones etiquetadas por los analistas para reentrenar. */
@Component
public class EntrenamientoClient {

    private static final Logger log = LoggerFactory.getLogger(EntrenamientoClient.class);

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResultadoEntrenamiento(
            String version,
            String algoritmo,
            @JsonProperty("precision") Double precisionScore,
            @JsonProperty("recall") Double recallScore,
            @JsonProperty("f1_score") Double f1Score,
            @JsonProperty("auc_roc") Double aucRoc,
            Integer muestras) {
    }

    private final RestClient restClient;
    private final IaProperties props;

    public EntrenamientoClient(@Qualifier("iaEntrenamientoRestClient") RestClient restClient, IaProperties props) {
        this.restClient = restClient;
        this.props = props;
    }

    public ResultadoEntrenamiento entrenar(List<Map<String, Object>> muestras) {
        if (!props.enabled()) {
            throw new IaServiceException("La integración con el microservicio de IA está desactivada (app.ia.enabled=false)");
        }
        try {
            ResultadoEntrenamiento r = restClient.post()
                    .uri("/train")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("muestras", muestras))
                    .retrieve()
                    .body(ResultadoEntrenamiento.class);
            if (r == null) {
                throw new IaServiceException("FastAPI no devolvió el resultado del entrenamiento");
            }
            return r;
        } catch (RestClientException e) {
            log.error("Error al reentrenar el modelo: {}", e.getMessage());
            throw new IaServiceException("No se pudo reentrenar el modelo: " + e.getMessage());
        }
    }
}
