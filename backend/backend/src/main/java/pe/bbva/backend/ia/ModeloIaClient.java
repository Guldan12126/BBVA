package pe.bbva.backend.ia;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import pe.bbva.backend.config.properties.IaProperties;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Cliente del microservicio de IA (FastAPI).
 * POST /predict -> probabilidad de fraude + factores explicativos (SHAP).
 * Si FastAPI falla, durante 30 segundos no se vuelve a intentar y se usan las reglas de respaldo.
 */
@Component
public class ModeloIaClient {

    private static final Logger log = LoggerFactory.getLogger(ModeloIaClient.class);
    private static final long ESPERA_TRAS_FALLO_MS = 30_000;

    /** Respuesta de POST /predict (los nombres en snake_case vienen de Python). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PrediccionResponse(
            @JsonProperty("transaccion_id") String transaccionId,
            Double score,
            @JsonProperty("nivel_riesgo") String nivelRiesgo,
            @JsonProperty("version_modelo") String versionModelo,
            @JsonProperty("tiempo_ms") Long tiempoMs,
            List<Factor> factores) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Factor(String factor, String descripcion, Double impacto) {
    }

    private final RestClient restClient;
    private final IaProperties props;

    private volatile long ultimoFallo = 0;
    private volatile boolean disponible = false;
    private volatile LocalDateTime ultimaVerificacion;

    public ModeloIaClient(@Qualifier("iaRestClient") RestClient restClient, IaProperties props) {
        this.restClient = restClient;
        this.props = props;
    }

    public Optional<PrediccionResponse> predecir(Map<String, Object> variables) {
        if (!props.enabled() || System.currentTimeMillis() - ultimoFallo < ESPERA_TRAS_FALLO_MS) {
            return Optional.empty();
        }
        try {
            PrediccionResponse respuesta = restClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(variables)
                    .retrieve()
                    .body(PrediccionResponse.class);
            disponible = respuesta != null && respuesta.score() != null;
            return disponible ? Optional.of(respuesta) : Optional.empty();
        } catch (RestClientException e) {
            registrarFallo(e);
            return Optional.empty();
        }
    }

    /** GET /health: true si el microservicio responde. */
    public boolean verificarSalud() {
        ultimaVerificacion = LocalDateTime.now();
        if (!props.enabled()) {
            disponible = false;
            return false;
        }
        try {
            restClient.get().uri("/health").retrieve().toBodilessEntity();
            disponible = true;
            ultimoFallo = 0;
        } catch (RestClientException e) {
            registrarFallo(e);
        }
        return disponible;
    }

    /** GET /model/info: versión y métricas del modelo cargado en FastAPI. */
    public Optional<Map<String, Object>> informacionModelo() {
        if (!props.enabled()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get().uri("/model/info").retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    }));
        } catch (RestClientException e) {
            registrarFallo(e);
            return Optional.empty();
        }
    }

    private void registrarFallo(RestClientException e) {
        if (disponible || ultimoFallo == 0) {
            log.warn("Microservicio de IA no disponible en {}: {}. Se usarán las reglas de respaldo.",
                    props.url(), e.getMessage());
        }
        disponible = false;
        ultimoFallo = System.currentTimeMillis();
    }

    public boolean isDisponible() {
        return disponible;
    }

    public LocalDateTime getUltimaVerificacion() {
        return ultimaVerificacion;
    }

    public String getUrl() {
        return props.url();
    }

    public boolean isHabilitado() {
        return props.enabled();
    }
}
